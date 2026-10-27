-- Variant-level pricing and durable cleanup for product-images Storage.

alter table public.products
  add column if not exists pricing_mode text not null default 'general';

alter table public.products alter column price_cents drop not null;

alter table public.products
  drop constraint if exists products_pricing_mode_check,
  add constraint products_pricing_mode_check
    check (pricing_mode in ('general', 'variant'));

alter table public.product_variants
  add column if not exists price_cents integer,
  add column if not exists initial_price_cents integer not null default 0;

alter table public.product_variants
  drop constraint if exists product_variants_price_cents_check,
  add constraint product_variants_price_cents_check
    check (price_cents is null or price_cents >= 0),
  drop constraint if exists product_variants_initial_price_cents_check,
  add constraint product_variants_initial_price_cents_check
    check (initial_price_cents >= 0);

-- Preserve existing storefront prices and acquisition costs per existing variant.
update public.product_variants pv
set price_cents = p.price_cents,
    initial_price_cents = p.initialprice_cents
from public.products p
where p.id = pv.product_id
  and (pv.price_cents is null or pv.initial_price_cents = 0);

alter table public.products
  drop constraint if exists products_price_by_mode_check,
  add constraint products_price_by_mode_check
    check (
      (pricing_mode = 'general' and price_cents is not null and price_cents >= 0)
      or (pricing_mode = 'variant' and price_cents is null)
    );

create or replace function public.validate_variant_pricing()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_product_id bigint;
  v_is_published boolean;
  v_pricing_mode text;
begin
  v_product_id := coalesce(new.product_id, old.product_id);

  select p.published, p.pricing_mode
    into v_is_published, v_pricing_mode
  from public.products p
  where p.id = v_product_id;

  if v_is_published and v_pricing_mode = 'variant' then
    if exists (
      select 1 from public.product_variants pv
      where pv.product_id = v_product_id
        and pv.active
        and pv.price_cents is null
    ) then
      raise exception 'Todas las variantes activas deben tener un precio para publicar el producto';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists product_variant_pricing_guard on public.product_variants;
create constraint trigger product_variant_pricing_guard
after insert or update or delete on public.product_variants
deferrable initially deferred
for each row execute function public.validate_variant_pricing();

create or replace function public.validate_product_pricing()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.published and new.pricing_mode = 'variant' then
    if exists (
      select 1 from public.product_variants pv
      where pv.product_id = new.id and pv.active and pv.price_cents is null
    ) then
      raise exception 'Todas las variantes activas deben tener un precio para publicar el producto';
    end if;
    if not exists (
      select 1 from public.product_variants pv
      where pv.product_id = new.id and pv.active and pv.qty > 0 and pv.price_cents is not null
    ) then
      raise exception 'Se requiere al menos una variante activa con stock y precio para publicar';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists product_pricing_guard on public.products;
create trigger product_pricing_guard
before insert or update of published, pricing_mode, price_cents on public.products
for each row execute function public.validate_product_pricing();

-- Replace checkout RPC so all snapshots and stock decisions are database-authoritative.
create or replace function public.create_order_with_stock(
  p_user_id uuid,
  p_total_cents integer,
  p_items jsonb,
  p_shipping_address_id bigint,
  p_coupon_code text default null,
  p_discount_amount integer default 0,
  p_guest_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_variant_id bigint;
  v_product_id bigint;
  v_quantity integer;
  v_stock integer;
  v_sku text;
  v_title text;
  v_size text;
  v_price integer;
  v_cost integer;
  v_subtotal bigint := 0;
  v_guest_email text := nullif(trim(p_guest_email), '');
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_variant_id := (v_item->>'variant_id')::bigint;
    v_quantity := (v_item->>'quantity')::integer;
    if v_variant_id is null or v_quantity is null or v_quantity <= 0 then
      raise exception 'Variante o cantidad inválida';
    end if;

    select pv.product_id, pv.sku, pv.size_label, pv.qty, pv.initial_price_cents,
      p.title,
      case when p.pricing_mode = 'variant' then pv.price_cents else p.price_cents end
    into v_product_id, v_sku, v_size, v_stock, v_cost, v_title, v_price
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = v_variant_id and pv.active and p.published
    for update of pv;

    if not found then raise exception 'Variante no disponible'; end if;
    if (v_item->>'product_id')::bigint is distinct from v_product_id then
      raise exception 'La variante no pertenece al producto enviado';
    end if;
    if v_stock < v_quantity then raise exception 'Stock insuficiente para la variante %', v_variant_id; end if;
    if v_price is null then raise exception 'La variante no tiene precio configurado'; end if;
    if (v_item->>'price_cents')::integer is distinct from v_price then
      raise exception 'El precio cambió; actualiza el carrito e inténtalo de nuevo';
    end if;

    v_subtotal := v_subtotal + (v_price::bigint * v_quantity);
  end loop;

  if coalesce(p_discount_amount, 0) < 0 or coalesce(p_discount_amount, 0) > v_subtotal then
    raise exception 'Descuento inválido';
  end if;
  if p_total_cents not in (
    greatest(0, v_subtotal - coalesce(p_discount_amount, 0))::integer,
    (greatest(0, v_subtotal - coalesce(p_discount_amount, 0)) + 15000)::integer
  ) then
    raise exception 'Total del pedido inválido';
  end if;

  insert into public.orders (
    user_id, guest_email, status, total_cents, shipping_address_id, billing_address_id,
    coupon_code, discount_amount_cents
  ) values (
    p_user_id, case when p_user_id is null then v_guest_email else null end,
    'pending_payment', p_total_cents, p_shipping_address_id, p_shipping_address_id,
    p_coupon_code, coalesce(p_discount_amount, 0)
  ) returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_variant_id := (v_item->>'variant_id')::bigint;
    v_quantity := (v_item->>'quantity')::integer;
    select pv.product_id, pv.sku, pv.size_label, pv.initial_price_cents, p.title,
      case when p.pricing_mode = 'variant' then pv.price_cents else p.price_cents end
    into v_product_id, v_sku, v_size, v_cost, v_title, v_price
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = v_variant_id;

    update public.product_variants set qty = qty - v_quantity where id = v_variant_id;
    insert into public.order_items (
      order_id, product_id, variant_id, sku, title, size_label,
      unit_price_cents, quantity, line_total_cents, initial_price_cents
    ) values (
      v_order_id, v_product_id, v_variant_id, v_sku, v_title, v_size,
      v_price, v_quantity, v_price * v_quantity, coalesce(v_cost, 0)
    );
  end loop;
  return v_order_id;
end;
$$;

revoke all on function public.create_order_with_stock(uuid, integer, jsonb, bigint, text, integer, text) from public, anon, authenticated;
grant execute on function public.create_order_with_stock(uuid, integer, jsonb, bigint, text, integer, text) to service_role;

-- POS keeps its intentional manual sale price, while its cost snapshot is variant-specific.
create or replace function public.create_pos_order_with_stock(
  p_admin_user_id uuid,
  p_variant_id bigint,
  p_quantity integer default 1,
  p_unit_price_cents integer default 0,
  p_customer_name text default null,
  p_customer_email text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_product_id bigint;
  v_sku text;
  v_size text;
  v_stock integer;
  v_title text;
  v_cost integer;
  v_currency char(3);
  v_email text := lower(nullif(trim(p_customer_email), ''));
  v_name text := nullif(trim(p_customer_name), '');
  v_total integer;
begin
  if p_admin_user_id is null or p_variant_id is null or p_quantity is null or p_quantity <= 0
    or p_unit_price_cents is null or p_unit_price_cents < 0 then
    raise exception 'Datos de venta inválidos';
  end if;

  select pv.product_id, pv.sku, pv.size_label, pv.qty, pv.initial_price_cents,
    p.title, p.currency
  into v_product_id, v_sku, v_size, v_stock, v_cost, v_title, v_currency
  from public.product_variants pv join public.products p on p.id = pv.product_id
  where pv.id = p_variant_id and pv.active for update of pv;
  if not found then raise exception 'Variante no encontrada'; end if;
  if v_stock < p_quantity then raise exception 'Stock insuficiente'; end if;
  if v_email is not null and v_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'Correo inválido';
  end if;

  v_total := p_unit_price_cents * p_quantity;
  insert into public.orders (
    user_id, guest_email, sold_to_name, status, total_cents, currency,
    payment_status, delivery_method, sales_channel, sold_by_admin_id, pos_note,
    created_at, updated_at, external_reference
  ) values (
    null, v_email, v_name, 'delivered', v_total, coalesce(v_currency, 'MXN'),
    'approved', 'pickup', 'physical_pos', p_admin_user_id, nullif(trim(p_note), ''),
    now(), now(), gen_random_uuid()::text
  ) returning id into v_order_id;
  update public.orders set external_reference = v_order_id::text where id = v_order_id;

  insert into public.order_items (
    order_id, product_id, variant_id, sku, title, size_label,
    unit_price_cents, quantity, line_total_cents, initial_price_cents
  ) values (
    v_order_id, v_product_id, p_variant_id, v_sku, coalesce(v_title, 'Producto'), v_size,
    p_unit_price_cents, p_quantity, v_total, coalesce(v_cost, 0)
  );
  update public.product_variants set qty = qty - p_quantity where id = p_variant_id;
  return v_order_id;
end;
$$;

revoke all on function public.create_pos_order_with_stock(uuid, bigint, integer, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.create_pos_order_with_stock(uuid, bigint, integer, integer, text, text, text) to service_role;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.storage_cleanup_jobs (
  id bigint generated always as identity primary key,
  bucket_id text not null,
  object_path text not null,
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  locked_until timestamptz,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (bucket_id, object_path)
);

alter table public.storage_cleanup_jobs enable row level security;
revoke all on public.storage_cleanup_jobs from public, anon, authenticated;
grant all on public.storage_cleanup_jobs to service_role;

create or replace function private.enqueue_product_image_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
begin
  v_path := substring(old.url from '/object/public/product-images/(.+)$');
  if v_path is not null and v_path <> '' then
    insert into public.storage_cleanup_jobs (bucket_id, object_path)
    values ('product-images', v_path)
    on conflict (bucket_id, object_path) do update
      set completed_at = null, available_at = now(), locked_until = null, last_error = null;
  end if;
  return old;
end;
$$;
revoke all on function private.enqueue_product_image_cleanup() from public, anon, authenticated;

drop trigger if exists product_image_storage_cleanup on public.product_images;
create trigger product_image_storage_cleanup
after delete on public.product_images
for each row execute function private.enqueue_product_image_cleanup();

create or replace function public.claim_storage_cleanup_jobs(p_limit integer default 100)
returns table(id bigint, bucket_id text, object_path text)
language sql
security definer
set search_path = ''
as $$
  with candidates as (
    select j.id from public.storage_cleanup_jobs j
    where j.completed_at is null and j.available_at <= now()
      and (j.locked_until is null or j.locked_until < now())
    order by j.available_at, j.id
    for update skip locked limit greatest(1, least(coalesce(p_limit, 100), 500))
  )
  update public.storage_cleanup_jobs j
  set locked_until = now() + interval '5 minutes'
  from candidates c where j.id = c.id
  returning j.id, j.bucket_id, j.object_path;
$$;

create or replace function public.finish_storage_cleanup_job(p_job_id bigint, p_error text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_error is null then
    update public.storage_cleanup_jobs
    set completed_at = now(), locked_until = null, last_error = null
    where id = p_job_id and completed_at is null;
  else
    update public.storage_cleanup_jobs
    set attempts = attempts + 1,
        available_at = now() + make_interval(secs => least(86400, 30 * power(2, least(attempts, 10))::integer)),
        locked_until = null,
        last_error = left(p_error, 1000)
    where id = p_job_id and completed_at is null;
  end if;
end;
$$;

revoke all on function public.claim_storage_cleanup_jobs(integer) from public, anon, authenticated;
revoke all on function public.finish_storage_cleanup_job(bigint, text) from public, anon, authenticated;
grant execute on function public.claim_storage_cleanup_jobs(integer) to service_role;
grant execute on function public.finish_storage_cleanup_job(bigint, text) to service_role;

create index if not exists storage_cleanup_jobs_ready_idx
  on public.storage_cleanup_jobs (available_at, id)
  where completed_at is null;
