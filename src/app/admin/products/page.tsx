// app/admin/products/page.tsx
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { supabaseServer } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import RowActions from './row-actions'

const PAGE_SIZE = 16

type ConditionFilter = 'all' | 'new' | 'used'
type PublishedFilter = 'all' | 'published' | 'draft'

type PageSearchParams = {
  q?: string | string[]
  condition?: string | string[]
  published?: string | string[]
  page?: string | string[]
}

function getParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return typeof value === 'string' ? value : ''
}

function parsePage(value: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.floor(parsed)
}

function sanitizeSearchTerm(value: string): string {
  return value.replace(/[%(),]/g, ' ').trim()
}

function getPageWindow(currentPage: number, totalPages: number): number[] {
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, currentPage + 2)
  const pages: number[] = []

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  return pages
}

function buildProductsHref(params: {
  q: string
  condition: ConditionFilter
  published: PublishedFilter
  page: number
}): string {
  const search = new URLSearchParams()

  if (params.q) search.set('q', params.q)
  if (params.condition !== 'all') search.set('condition', params.condition)
  if (params.published !== 'all') search.set('published', params.published)
  if (params.page > 1) search.set('page', String(params.page))

  const query = search.toString()
  return query ? `/admin/products?${query}` : '/admin/products'
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>
}) {
  const supa = await supabaseServer()
  const resolvedSearchParams = await searchParams

  const q = getParam(resolvedSearchParams.q).trim()
  const searchTerm = sanitizeSearchTerm(q)

  const rawCondition = getParam(resolvedSearchParams.condition).toLowerCase()
  const conditionFilter: ConditionFilter =
    rawCondition === 'new' || rawCondition === 'used' ? rawCondition : 'all'

  const rawPublished = getParam(resolvedSearchParams.published).toLowerCase()
  const publishedFilter: PublishedFilter =
    rawPublished === 'published' || rawPublished === 'draft' ? rawPublished : 'all'

  const requestedPage = parsePage(getParam(resolvedSearchParams.page))

  let countQuery = supa
    .from('products')
    .select('id', { count: 'exact', head: true })

  if (searchTerm) {
    const pattern = `%${searchTerm}%`
    countQuery = countQuery.or(
      `title.ilike.${pattern},slug.ilike.${pattern},brand.ilike.${pattern},model_name.ilike.${pattern}`
    )
  }

  if (conditionFilter !== 'all') {
    countQuery = countQuery.eq('condition', conditionFilter)
  }

  if (publishedFilter === 'published') {
    countQuery = countQuery.eq('published', true)
  } else if (publishedFilter === 'draft') {
    countQuery = countQuery.eq('published', false)
  }

  const { count, error: countError } = await countQuery

  if (countError) {
    console.error('Error counting products:', countError)
  }

  const totalItems = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const currentPage = Math.min(requestedPage, totalPages)
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let productsQuery = supa
    .from('products')
    .select('id,title,slug,price_cents,initialprice_cents,currency,published,brand,model_name,condition,description,created_at')

  if (searchTerm) {
    const pattern = `%${searchTerm}%`
    productsQuery = productsQuery.or(
      `title.ilike.${pattern},slug.ilike.${pattern},brand.ilike.${pattern},model_name.ilike.${pattern}`
    )
  }

  if (conditionFilter !== 'all') {
    productsQuery = productsQuery.eq('condition', conditionFilter)
  }

  if (publishedFilter === 'published') {
    productsQuery = productsQuery.eq('published', true)
  } else if (publishedFilter === 'draft') {
    productsQuery = productsQuery.eq('published', false)
  }

  const { data: products, error: productsError } = await productsQuery
    .order('created_at', { ascending: false })
    .range(from, to)

  if (productsError) {
    console.error('Error fetching products:', productsError)
    return <div className="p-6">Error al cargar productos</div>
  }

  const pageWindow = getPageWindow(currentPage, totalPages)
  const showingFrom = totalItems === 0 ? 0 : from + 1
  const showingTo = totalItems === 0 ? 0 : Math.min(to + 1, totalItems)

  return (
    <div className="p-4 space-y-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold sm:text-2xl">Productos</h1>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo producto
          </Link>
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <form method="get" className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_auto_auto]">
          <Input
            name="q"
            defaultValue={q}
            placeholder="Buscar por titulo, slug, marca o modelo"
          />

          <select
            name="condition"
            defaultValue={conditionFilter}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="all">Todas las condiciones</option>
            <option value="new">Nuevo</option>
            <option value="used">Usado</option>
          </select>

          <select
            name="published"
            defaultValue={publishedFilter}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="all">Todos</option>
            <option value="published">Publicados</option>
            <option value="draft">Borradores</option>
          </select>

          <Button type="submit">Filtrar</Button>
          <Button asChild type="button" variant="outline">
            <Link href="/admin/products">Limpiar</Link>
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">
          {totalItems === 0
            ? 'Sin resultados para los filtros actuales.'
            : `Mostrando ${showingFrom}-${showingTo} de ${totalItems} productos.`}
        </p>
      </Card>

      {/* Vista de tabla para desktop */}
      <Card className="hidden p-0 overflow-hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-muted/50">
                <th className="p-3 font-medium">Titulo</th>
                <th className="p-3 font-medium">Marca / Modelo</th>
                <th className="p-3 font-medium">Condicion</th>
                <th className="p-3 font-medium">Precio</th>
                <th className="p-3 font-medium">Costo</th>
                <th className="p-3 font-medium">Ganancia</th>
                <th className="p-3 font-medium">Publicado</th>
                <th className="p-3 font-medium w-[420px]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(products ?? []).map((product) => {
                const earnings = (product.price_cents || 0) - (product.initialprice_cents || 0)
                return (
                  <tr key={product.id} className="transition-colors border-t hover:bg-muted/30">
                    <td className="p-3">
                      <div className="font-medium">{product.title}</div>
                      <div className="text-xs text-muted-foreground">{product.slug}</div>
                    </td>
                    <td className="p-3">
                      <div>{product.brand ?? '-'}</div>
                      <div className="text-xs text-muted-foreground">{product.model_name ?? '-'}</div>
                    </td>
                    <td className="p-3">{product.condition}</td>
                    <td className="p-3 whitespace-nowrap">
                      {product.currency} ${(product.price_cents / 100).toFixed(2)}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {product.currency} ${((product.initialprice_cents || 0) / 100).toFixed(2)}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {product.currency} ${(earnings / 100).toFixed(2)}
                    </td>
                    <td className="p-3">{product.published ? 'Si' : 'No'}</td>
                    <td className="p-3">
                      <RowActions product={product} />
                    </td>
                  </tr>
                )
              })}

              {(!products || products.length === 0) && (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={8}>
                    No se encontraron productos con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Vista de cards para móvil y tablet */}
      <div className="space-y-3 lg:hidden">
        {(products ?? []).map((product) => (
          <Card key={product.id} className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium truncate">{product.title}</h3>
                  <p className="text-xs truncate text-muted-foreground">{product.slug}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      product.published
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {product.published ? 'Publicado' : 'Borrador'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Marca:</span>
                  <p className="font-medium">{product.brand ?? '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Modelo:</span>
                  <p className="font-medium">{product.model_name ?? '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Condicion:</span>
                  <p className="font-medium">{product.condition}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Precio:</span>
                  <p className="text-lg font-medium">{product.currency} ${(product.price_cents / 100).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Costo:</span>
                  <p className="font-medium">{product.currency} ${((product.initialprice_cents || 0) / 100).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Ganancia:</span>
                  <p className="font-medium">
                    {product.currency} ${(((product.price_cents || 0) - (product.initialprice_cents || 0)) / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t">
                <RowActions product={product} />
              </div>
            </div>
          </Card>
        ))}

        {(!products || products.length === 0) && (
          <Card className="p-8">
            <p className="text-center text-muted-foreground">
              No se encontraron productos con los filtros actuales.
            </p>
          </Card>
        )}
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {currentPage} de {totalPages}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {currentPage > 1 ? (
              <Button asChild size="sm" variant="outline">
                <Link
                  href={buildProductsHref({
                    q,
                    condition: conditionFilter,
                    published: publishedFilter,
                    page: currentPage - 1,
                  })}
                >
                  Anterior
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled>
                Anterior
              </Button>
            )}

            {pageWindow.map((page) => (
              <Button
                key={page}
                asChild
                size="sm"
                variant={page === currentPage ? 'default' : 'outline'}
              >
                <Link
                  href={buildProductsHref({
                    q,
                    condition: conditionFilter,
                    published: publishedFilter,
                    page,
                  })}
                >
                  {page}
                </Link>
              </Button>
            ))}

            {currentPage < totalPages ? (
              <Button asChild size="sm" variant="outline">
                <Link
                  href={buildProductsHref({
                    q,
                    condition: conditionFilter,
                    published: publishedFilter,
                    page: currentPage + 1,
                  })}
                >
                  Siguiente
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled>
                Siguiente
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
