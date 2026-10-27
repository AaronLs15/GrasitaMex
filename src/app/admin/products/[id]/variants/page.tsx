// app/admin/products/[id]/variants/page.tsx

import { supabaseServer } from '@/lib/supabase/server'

export default async function VariantsPage({
  params,
}: {
  // 👇 importante: params es Promise en server components
  params: Promise<{ id: string }>
}) {
  const { id } = await params              // ← desenvuelve primero
  const productId = Number(id)

  const supa = await supabaseServer()

  const [{ data: product }, { data: variants }] = await Promise.all([
    supa.from('products').select('id,title,pricing_mode,price_cents,initialprice_cents,currency').eq('id', productId).maybeSingle(),
    supa
      .from('product_variants')
      .select('id, sku, size_label, qty, active, price_cents, initial_price_cents, created_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: false }),
  ])

  if (!product) return <div className="p-6">Producto no encontrado</div>

  const VariantsClient = (await import('./widgets')).default
  return <VariantsClient productId={productId} productTitle={product.title} pricingMode={product.pricing_mode} currency={product.currency} defaultPriceCents={product.price_cents ?? 0} defaultCostCents={product.initialprice_cents ?? 0} initial={variants ?? []} />
}
