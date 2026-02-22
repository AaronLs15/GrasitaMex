-- Allow deleting products even when they exist in historical orders.
-- Strategy:
-- 1) Keep order_items snapshots (title/sku/size/price) as source of truth.
-- 2) Null FK references from order_items when catalog rows are deleted.
-- 3) Cascade-delete catalog-only relations (variants/images/categories) with the product.

alter table public.order_items
  drop constraint if exists order_items_product_id_fkey;

alter table public.order_items
  alter column product_id drop not null;

alter table public.order_items
  add constraint order_items_product_id_fkey
  foreign key (product_id)
  references public.products(id)
  on delete set null;

alter table public.order_items
  drop constraint if exists order_items_variant_id_fkey;

alter table public.order_items
  alter column variant_id drop not null;

alter table public.order_items
  add constraint order_items_variant_id_fkey
  foreign key (variant_id)
  references public.product_variants(id)
  on delete set null;

alter table public.product_variants
  drop constraint if exists product_variants_product_id_fkey;

alter table public.product_variants
  add constraint product_variants_product_id_fkey
  foreign key (product_id)
  references public.products(id)
  on delete cascade;

alter table public.product_images
  drop constraint if exists product_images_product_id_fkey;

alter table public.product_images
  add constraint product_images_product_id_fkey
  foreign key (product_id)
  references public.products(id)
  on delete cascade;

alter table public.product_categories
  drop constraint if exists product_categories_product_id_fkey;

alter table public.product_categories
  add constraint product_categories_product_id_fkey
  foreign key (product_id)
  references public.products(id)
  on delete cascade;

notify pgrst, 'reload schema';
