-- POS (venta fisica) support and channel-aware earnings for analytics.

alter table public.orders
  add column if not exists sales_channel text;

update public.orders
set sales_channel = 'online_mp'
where sales_channel is null;

alter table public.orders
  alter column sales_channel set default 'online_mp';

alter table public.orders
  alter column sales_channel set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_sales_channel_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_sales_channel_check
      check (sales_channel = any (array['online_mp', 'physical_pos']));
  end if;
end $$;

alter table public.orders
  add column if not exists sold_by_admin_id uuid;

alter table public.orders
  add column if not exists sold_to_name text;

alter table public.orders
  add column if not exists pos_note text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_sold_by_admin_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_sold_by_admin_id_fkey
      foreign key (sold_by_admin_id)
      references public.profiles(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_orders_sales_channel_created_at
  on public.orders (sales_channel, created_at);

create index if not exists idx_orders_sold_by_admin_id
  on public.orders (sold_by_admin_id);

create or replace function public.create_pos_order_with_stock(
  p_admin_user_id uuid,
  p_variant_id bigint,
  p_quantity int default 1,
  p_unit_price_cents int default 0,
  p_customer_name text default null,
  p_customer_email text default null,
  p_note text default null
) returns uuid as $$
declare
  v_order_id uuid;
  v_product_id bigint;
  v_sku text;
  v_size_label text;
  v_current_stock int;
  v_title text;
  v_initial_price int;
  v_currency character(3);
  v_customer_email text;
  v_sold_to_name text;
  v_pos_note text;
  v_line_total int;
begin
  if p_admin_user_id is null then
    raise exception 'Admin user is required';
  end if;

  if p_variant_id is null then
    raise exception 'Variant is required';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than 0';
  end if;

  if p_unit_price_cents is null or p_unit_price_cents < 0 then
    raise exception 'Unit price must be >= 0';
  end if;

  select
    pv.product_id,
    pv.sku,
    pv.size_label,
    pv.qty,
    p.title,
    p.initialprice_cents,
    p.currency
  into
    v_product_id,
    v_sku,
    v_size_label,
    v_current_stock,
    v_title,
    v_initial_price,
    v_currency
  from public.product_variants pv
  join public.products p on p.id = pv.product_id
  where pv.id = p_variant_id
  for update of pv;

  if not found then
    raise exception 'Variant % not found', p_variant_id;
  end if;

  if v_current_stock < p_quantity then
    raise exception 'Insufficient stock for variant %', p_variant_id;
  end if;

  v_customer_email := lower(nullif(trim(p_customer_email), ''));
  v_sold_to_name := nullif(trim(p_customer_name), '');
  v_pos_note := nullif(trim(p_note), '');

  if v_customer_email is not null and v_customer_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'Invalid customer email';
  end if;

  v_line_total := p_unit_price_cents * p_quantity;

  insert into public.orders (
    user_id,
    guest_email,
    sold_to_name,
    status,
    total_cents,
    currency,
    shipping_address_id,
    billing_address_id,
    payment_status,
    delivery_method,
    sales_channel,
    sold_by_admin_id,
    pos_note,
    created_at,
    updated_at
  ) values (
    null,
    v_customer_email,
    v_sold_to_name,
    'delivered',
    v_line_total,
    coalesce(v_currency, 'MXN'),
    null,
    null,
    'approved',
    'pickup',
    'physical_pos',
    p_admin_user_id,
    v_pos_note,
    now(),
    now()
  )
  returning id into v_order_id;

  update public.orders
  set external_reference = v_order_id::text
  where id = v_order_id;

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
    v_product_id,
    p_variant_id,
    v_sku,
    coalesce(v_title, 'Producto'),
    v_size_label,
    p_unit_price_cents,
    p_quantity,
    v_line_total,
    coalesce(v_initial_price, 0)
  );

  update public.product_variants
  set qty = qty - p_quantity
  where id = p_variant_id;

  return v_order_id;
end;
$$ language plpgsql;

grant execute on function public.create_pos_order_with_stock(uuid, bigint, int, int, text, text, text) to service_role;

create or replace function public.get_admin_dashboard_snapshot()
returns jsonb
language sql
stable
as $$
with valid_orders as (
  select
    o.id,
    o.created_at,
    o.total_cents,
    o.status,
    coalesce(o.sales_channel, 'online_mp') as sales_channel
  from public.orders o
  where o.status in ('paid', 'processing', 'shipped', 'delivered')
),
order_gross as (
  select
    oi.order_id,
    coalesce(sum(((oi.unit_price_cents - oi.initial_price_cents) * oi.quantity)::bigint), 0) as gross_cents,
    coalesce(sum((oi.unit_price_cents * oi.quantity)::bigint), 0) as items_total_cents
  from public.order_items oi
  join valid_orders vo on vo.id = oi.order_id
  group by oi.order_id
),
order_fee as (
  select
    vo.id as order_id,
    case
      when vo.sales_channel = 'physical_pos' then 0::bigint
      else round((coalesce(vo.total_cents, 0)::numeric * 0.0349) + 400)::bigint
    end as fee_cents
  from valid_orders vo
),
order_net as (
  select
    vo.id as order_id,
    vo.created_at,
    vo.status,
    vo.total_cents,
    coalesce(og.gross_cents, 0) as gross_cents,
    coalesce(ofe.fee_cents, 0) as fee_cents,
    coalesce(og.gross_cents, 0) - coalesce(ofe.fee_cents, 0) as net_cents
  from valid_orders vo
  left join order_gross og on og.order_id = vo.id
  left join order_fee ofe on ofe.order_id = vo.id
),
views_by_day as (
  select pv.created_at::date as day, count(*)::int as views
  from public.page_views pv
  group by pv.created_at::date
),
customers_by_day as (
  select p.created_at::date as day, count(*)::int as customers
  from public.profiles p
  where p.role = 'customer'
  group by p.created_at::date
),
orders_by_day as (
  select
    onet.created_at::date as day,
    count(*) filter (where onet.status = 'delivered')::int as delivered_orders,
    coalesce(sum(onet.total_cents)::bigint, 0) as sales_cents,
    coalesce(sum(onet.net_cents), 0) as earnings_cents
  from order_net onet
  group by onet.created_at::date
),
views_by_month as (
  select date_trunc('month', pv.created_at)::date as month, count(*)::int as views
  from public.page_views pv
  group by date_trunc('month', pv.created_at)::date
),
customers_by_month as (
  select date_trunc('month', p.created_at)::date as month, count(*)::int as customers
  from public.profiles p
  where p.role = 'customer'
  group by date_trunc('month', p.created_at)::date
),
orders_by_month as (
  select
    date_trunc('month', onet.created_at)::date as month,
    count(*) filter (where onet.status = 'delivered')::int as delivered_orders,
    coalesce(sum(onet.total_cents)::bigint, 0) as sales_cents,
    coalesce(sum(onet.net_cents), 0) as earnings_cents
  from order_net onet
  group by date_trunc('month', onet.created_at)::date
),
weekly_series as (
  select d::date as day
  from generate_series(current_date - interval '6 day', current_date, interval '1 day') d
),
monthly_series as (
  select d::date as day
  from generate_series(current_date - interval '29 day', current_date, interval '1 day') d
),
yearly_series as (
  select date_trunc('month', d)::date as month
  from generate_series(
    date_trunc('month', current_date) - interval '11 month',
    date_trunc('month', current_date),
    interval '1 month'
  ) d
),
product_general_categories as (
  select pc.product_id, c.name
  from public.product_categories pc
  join public.categories c on c.id = pc.category_id
  where c.kind = 'general'
),
category_earnings as (
  select
    coalesce(pgc.name, 'Sin categoría') as category,
    sum(
      ((oi.unit_price_cents - oi.initial_price_cents) * oi.quantity)::bigint
      -
      case
        when coalesce(og.items_total_cents, 0) > 0
          then round(
            (
              coalesce(ofe.fee_cents, 0)::numeric
              * ((oi.unit_price_cents * oi.quantity)::numeric)
            ) / og.items_total_cents::numeric
          )::bigint
        else 0
      end
    ) as net_cents
  from public.order_items oi
  join valid_orders vo on vo.id = oi.order_id
  left join order_gross og on og.order_id = oi.order_id
  left join order_fee ofe on ofe.order_id = oi.order_id
  left join product_general_categories pgc on pgc.product_id = oi.product_id
  group by coalesce(pgc.name, 'Sin categoría')
),
totals as (
  select jsonb_build_object(
    'views', (select count(*)::int from public.page_views),
    'customers', (select count(*)::int from public.profiles where role = 'customer'),
    'total_sales_cents', (select coalesce(sum(total_cents)::bigint, 0) from valid_orders),
    'delivered_count', (select count(*)::int from valid_orders where status = 'delivered'),
    'total_net_earnings_cents', (select coalesce(sum(net_cents), 0) from order_net)
  ) as data
),
weekly as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', to_char(ws.day, 'YYYY-MM-DD'),
        'views', coalesce(vbd.views, 0),
        'orders', coalesce(obd.delivered_orders, 0),
        'customers', coalesce(cbd.customers, 0),
        'sales', round(coalesce(obd.sales_cents, 0)::numeric / 100, 2),
        'earnings', round(coalesce(obd.earnings_cents, 0)::numeric / 100, 2)
      )
      order by ws.day
    ),
    '[]'::jsonb
  ) as data
  from weekly_series ws
  left join views_by_day vbd on vbd.day = ws.day
  left join customers_by_day cbd on cbd.day = ws.day
  left join orders_by_day obd on obd.day = ws.day
),
monthly as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', to_char(ms.day, 'YYYY-MM-DD'),
        'views', coalesce(vbd.views, 0),
        'orders', coalesce(obd.delivered_orders, 0),
        'customers', coalesce(cbd.customers, 0),
        'sales', round(coalesce(obd.sales_cents, 0)::numeric / 100, 2),
        'earnings', round(coalesce(obd.earnings_cents, 0)::numeric / 100, 2)
      )
      order by ms.day
    ),
    '[]'::jsonb
  ) as data
  from monthly_series ms
  left join views_by_day vbd on vbd.day = ms.day
  left join customers_by_day cbd on cbd.day = ms.day
  left join orders_by_day obd on obd.day = ms.day
),
yearly as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', to_char(ys.month, 'YYYY-MM'),
        'views', coalesce(vbm.views, 0),
        'orders', coalesce(obm.delivered_orders, 0),
        'customers', coalesce(cbm.customers, 0),
        'sales', round(coalesce(obm.sales_cents, 0)::numeric / 100, 2),
        'earnings', round(coalesce(obm.earnings_cents, 0)::numeric / 100, 2)
      )
      order by ys.month
    ),
    '[]'::jsonb
  ) as data
  from yearly_series ys
  left join views_by_month vbm on vbm.month = ys.month
  left join customers_by_month cbm on cbm.month = ys.month
  left join orders_by_month obm on obm.month = ys.month
),
category_top as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'category', ce.category,
        'earnings', round(ce.net_cents::numeric / 100, 2)
      )
      order by ce.net_cents desc
    ),
    '[]'::jsonb
  ) as data
  from (
    select category, net_cents
    from category_earnings
    order by net_cents desc
    limit 8
  ) ce
)
select jsonb_build_object(
  'totals', totals.data,
  'weekly', weekly.data,
  'monthly', monthly.data,
  'yearly', yearly.data,
  'category_earnings', category_top.data
)
from totals, weekly, monthly, yearly, category_top;
$$;

notify pgrst, 'reload schema';
