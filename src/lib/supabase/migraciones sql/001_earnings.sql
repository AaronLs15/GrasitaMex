-- Productos: costo y earnings (ganancia bruta por producto)
alter table public.products
  add column if not exists initialprice_cents integer not null default 0 check (initialprice_cents >= 0);

alter table public.products
  add column if not exists earnings integer generated always as (price_cents - initialprice_cents) stored;

-- Items de orden: snapshot del costo para reportes
alter table public.order_items
  add column if not exists initial_price_cents integer not null default 0;

-- Opcional: backfill de initial_price_cents en items existentes
update public.order_items oi
set initial_price_cents = p.initialprice_cents
from public.products p
where oi.product_id = p.id
  and oi.initial_price_cents = 0;

-- Actualiza create_order_with_stock para guardar initial_price_cents
create or replace function create_order_with_stock(
  p_user_id uuid,
  p_total_cents int,
  p_items jsonb,
  p_shipping_address_id bigint,
  p_coupon_code text default null,
  p_discount_amount int default 0
) returns uuid as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_variant_id bigint;
  v_quantity int;
  v_current_stock int;
  v_initial_price int;
begin
  insert into public.orders (
    user_id, status, total_cents, shipping_address_id, billing_address_id,
    coupon_code, discount_amount_cents
  )
  values (
    p_user_id, 'pending_payment', p_total_cents, p_shipping_address_id,
    p_shipping_address_id, p_coupon_code, p_discount_amount
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
      order_id, product_id, variant_id, sku, title, size_label,
      unit_price_cents, quantity, line_total_cents, initial_price_cents
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
