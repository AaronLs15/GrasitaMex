-- Admin dashboard aggregation RPC
-- Objective: move heavy analytics computation from Next.js server runtime into Postgres.

create index if not exists idx_orders_status_created_at
  on public.orders (status, created_at);

create index if not exists idx_page_views_created_at
  on public.page_views (created_at);

create index if not exists idx_profiles_role_created_at
  on public.profiles (role, created_at);

create index if not exists idx_order_items_order_id
  on public.order_items (order_id);

create index if not exists idx_product_categories_product_id
  on public.product_categories (product_id);

create or replace function public.get_admin_dashboard_snapshot()
returns jsonb
language sql
stable
as $$
with valid_orders as (
  select o.id, o.created_at, o.total_cents, o.status
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
order_net as (
  select
    vo.id as order_id,
    vo.created_at,
    vo.status,
    vo.total_cents,
    coalesce(og.gross_cents, 0) as gross_cents,
    round((coalesce(vo.total_cents, 0)::numeric * 0.0349) + 400)::bigint as fee_cents,
    coalesce(og.gross_cents, 0) - round((coalesce(vo.total_cents, 0)::numeric * 0.0349) + 400)::bigint as net_cents
  from valid_orders vo
  left join order_gross og on og.order_id = vo.id
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
              (round((coalesce(vo.total_cents, 0)::numeric * 0.0349) + 400)::numeric)
              * ((oi.unit_price_cents * oi.quantity)::numeric)
            ) / og.items_total_cents::numeric
          )::bigint
        else 0
      end
    ) as net_cents
  from public.order_items oi
  join valid_orders vo on vo.id = oi.order_id
  left join order_gross og on og.order_id = oi.order_id
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
