-- Guest checkout support
-- Allows creating orders without authenticated user and storing a guest email.

alter table public.orders
  alter column user_id drop not null;

alter table public.orders
  add column if not exists guest_email text;

create index if not exists idx_orders_guest_email
  on public.orders (guest_email);

-- Drop legacy 6-arg signature to avoid PostgREST ambiguity and cache mismatches.
drop function if exists public.create_order_with_stock(uuid, int, jsonb, bigint, text, int);

create or replace function create_order_with_stock(
  p_user_id uuid,
  p_total_cents int,
  p_items jsonb,
  p_shipping_address_id bigint,
  p_coupon_code text default null,
  p_discount_amount int default 0,
  p_guest_email text default null
) returns uuid as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_variant_id bigint;
  v_quantity int;
  v_current_stock int;
  v_initial_price int;
  v_guest_email text;
begin
  v_guest_email := nullif(trim(p_guest_email), '');

  insert into public.orders (
    user_id,
    guest_email,
    status,
    total_cents,
    shipping_address_id,
    billing_address_id,
    coupon_code,
    discount_amount_cents
  )
  values (
    p_user_id,
    case when p_user_id is null then v_guest_email else null end,
    'pending_payment',
    p_total_cents,
    p_shipping_address_id,
    p_shipping_address_id,
    p_coupon_code,
    p_discount_amount
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_variant_id := (v_item->>'variant_id')::bigint;
    v_quantity := (v_item->>'quantity')::int;

    select qty into v_current_stock
    from public.product_variants
    where id = v_variant_id
    for update;

    if not found then
      raise exception 'Variant % not found', v_variant_id;
    end if;

    if v_current_stock < v_quantity then
      raise exception 'Insufficient stock for variant %', v_variant_id;
    end if;

    update public.product_variants
    set qty = qty - v_quantity
    where id = v_variant_id;

    select initialprice_cents into v_initial_price
    from public.products
    where id = (v_item->>'product_id')::bigint;

    insert into public.order_items (
      order_id,
      product_id,
      variant_id,
      sku,
      title,
      size_label,
      unit_price_cents,
      quantity,
      line_total_cents,
      initial_price_cents
    ) values (
      v_order_id,
      (v_item->>'product_id')::bigint,
      v_variant_id,
      v_item->>'sku',
      v_item->>'title',
      v_item->>'size',
      (v_item->>'price_cents')::int,
      v_quantity,
      (v_item->>'price_cents')::int * v_quantity,
      coalesce(v_initial_price, 0)
    );
  end loop;

  return v_order_id;
end;
$$ language plpgsql;

grant execute on function public.create_order_with_stock(uuid, int, jsonb, bigint, text, int, text) to authenticated;
grant execute on function public.create_order_with_stock(uuid, int, jsonb, bigint, text, int, text) to service_role;

-- Force PostgREST cache refresh when running manually in SQL editor.
notify pgrst, 'reload schema';
