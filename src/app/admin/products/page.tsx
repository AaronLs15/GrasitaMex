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
    <div className="p-4 space-y-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold sm:text-2xl">Productos</h1>
        <ProductsClient initial={prods ?? []} categories={categories} />
      </div>

      {/* Vista de tabla para desktop */}
      <Card className="hidden p-0 overflow-hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-muted/50">
                <th className="p-3 font-medium">Título</th>
                <th className="p-3 font-medium">Marca / Modelo</th>
                <th className="p-3 font-medium">Condición</th>
                <th className="p-3 font-medium">Precio</th>
                <th className="p-3 font-medium">Publicado</th>
                <th className="p-3 font-medium w-[320px]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(prods ?? []).map(p => (
                <tr key={p.id} className="transition-colors border-t hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.slug}</div>
                  </td>
                  <td className="p-3">
                    <div>{p.brand ?? '-'}</div>
                    <div className="text-xs text-muted-foreground">{p.model_name ?? '-'}</div>
                  </td>
                  <td className="p-3">{p.condition}</td>
                  <td className="p-3 whitespace-nowrap">{p.currency} ${(p.price_cents/100).toFixed(2)}</td>
                  <td className="p-3">{p.published ? 'Sí' : 'No'}</td>
                  <td className="p-3">
                    <RowActions product={p} categories={categories} />
                  </td>
                </tr>
              ))}
              {(!prods || prods.length === 0) && (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={6}>
                    No hay productos. Usa "Nuevo producto".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Vista de cards para móvil y tablet */}
      <div className="space-y-3 lg:hidden">
        {(prods ?? []).map(p => (
          <Card key={p.id} className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium truncate">{p.title}</h3>
                  <p className="text-xs truncate text-muted-foreground">{p.slug}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    p.published 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {p.published ? 'Publicado' : 'Borrador'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Marca:</span>
                  <p className="font-medium">{p.brand ?? '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Modelo:</span>
                  <p className="font-medium">{p.model_name ?? '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Condición:</span>
                  <p className="font-medium">{p.condition}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Precio:</span>
                  <p className="text-lg font-medium">{p.currency} ${(p.price_cents/100).toFixed(2)}</p>
                </div>
              </div>

              <div className="pt-2 border-t">
                <RowActions product={p} categories={categories} />
              </div>
            </div>
          </Card>
        ))}
        
        {(!prods || prods.length === 0) && (
          <Card className="p-8">
            <p className="text-center text-muted-foreground">
              No hay productos. Usa "Nuevo producto".
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}