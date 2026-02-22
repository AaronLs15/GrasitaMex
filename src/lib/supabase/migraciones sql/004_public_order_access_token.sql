-- Public access token for checkout status pages.
-- Allows secure guest lookup of order summary without requiring auth session.

alter table public.orders
  add column if not exists public_access_token text;

update public.orders
set public_access_token = encode(gen_random_bytes(24), 'hex')
where public_access_token is null;

alter table public.orders
  alter column public_access_token set default encode(gen_random_bytes(24), 'hex');

alter table public.orders
  alter column public_access_token set not null;

create unique index if not exists idx_orders_public_access_token
  on public.orders (public_access_token);
