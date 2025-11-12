// app/admin/products/[id]/images/page.tsx
import { supabaseServer } from '@/lib/supabase/server'
import ProductImagesClient from './widgets'

export default async function ProductImagesPage({ params }: { params: Promise< { id: string }> }) {
  const {id} = await params
  const productId = Number(id)
  const supa = await supabaseServer()

  // Traer producto e imágenes
  const [{ data: product }, { data: images }] = await Promise.all([
    supa.from('products').select('id,title').eq('id', productId).maybeSingle(),
    supa.from('product_images').select('id, url, position').eq('product_id', productId).order('position', { ascending: true })
  ])

  if (!product) {
    return <div>Producto no encontrado</div>
  }

  return (
    <ProductImagesClient
      productId={productId}
      productTitle={product.title}
      initialImages={images ?? []}
    />
  )
}
