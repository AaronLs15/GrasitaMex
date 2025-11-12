// app/admin/products/page.tsx
import { supabaseServer } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import ProductsClient from './widgets'
import RowActions from './row-actions'

export default async function ProductsPage() {
  const supa = await supabaseServer()

  const [{ data: prods }, { data: cats }] = await Promise.all([
    supa.from('products')
      .select('id,title,slug,price_cents,currency,published,brand,model_name,condition,description,updated_at')
      .order('updated_at', { ascending: false }),
    supa.from('categories')
      .select('id,name,slug,kind')
      .order('name', { ascending: true }),
  ])

  const categories = cats ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Productos</h1>
        <ProductsClient initial={prods ?? []} categories={categories} />
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-3">Título</th>
              <th className="p-3">Marca / Modelo</th>
              <th className="p-3">Condición</th>
              <th className="p-3">Precio</th>
              <th className="p-3">Publicado</th>
              <th className="p-3 w-[320px]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(prods ?? []).map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-3">
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{p.slug}</div>
                </td>
                <td className="p-3">
                  <div>{p.brand ?? '-'}</div>
                  <div className="text-xs text-muted-foreground">{p.model_name ?? '-'}</div>
                </td>
                <td className="p-3">{p.condition}</td>
                <td className="p-3">{p.currency} ${(p.price_cents/100).toFixed(2)}</td>
                <td className="p-3">{p.published ? 'Sí' : 'No'}</td>
                <td className="p-3">
                  <RowActions product={p} categories={categories} />
                </td>
              </tr>
            ))}
            {(!prods || prods.length === 0) && (
              <tr>
                <td className="p-6 text-center text-muted-foreground" colSpan={6}>
                  No hay productos. Usa “Nuevo producto”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
