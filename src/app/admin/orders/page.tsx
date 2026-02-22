import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatMoney } from '@/lib/mercadopago'
import { formatInMexicoCity } from '@/lib/dates'
import RowActions from './row-actions'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type StatusFilter =
  | 'all'
  | 'created'
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

type ChannelFilter = 'all' | 'online_mp' | 'physical_pos'

type PageSearchParams = {
  q?: string | string[]
  status?: string | string[]
  channel?: string | string[]
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

function buildOrdersHref(params: {
  q: string
  status: StatusFilter
  channel: ChannelFilter
  page: number
}): string {
  const search = new URLSearchParams()

  if (params.q) search.set('q', params.q)
  if (params.status !== 'all') search.set('status', params.status)
  if (params.channel !== 'all') search.set('channel', params.channel)
  if (params.page > 1) search.set('page', String(params.page))

  const query = search.toString()
  return query ? `/admin/orders?${query}` : '/admin/orders'
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>
}) {
  const supa = await supabaseServer()
  const resolvedSearchParams = await searchParams

  const q = getParam(resolvedSearchParams.q).trim()
  const searchTerm = sanitizeSearchTerm(q)

  const rawStatus = getParam(resolvedSearchParams.status).toLowerCase()
  const statusFilter: StatusFilter =
    rawStatus === 'created' ||
    rawStatus === 'pending_payment' ||
    rawStatus === 'paid' ||
    rawStatus === 'processing' ||
    rawStatus === 'shipped' ||
    rawStatus === 'delivered' ||
    rawStatus === 'cancelled' ||
    rawStatus === 'refunded'
      ? rawStatus
      : 'all'

  const rawChannel = getParam(resolvedSearchParams.channel).toLowerCase()
  const channelFilter: ChannelFilter =
    rawChannel === 'online_mp' || rawChannel === 'physical_pos' ? rawChannel : 'all'

  const requestedPage = parsePage(getParam(resolvedSearchParams.page))

  let countQuery = supa
    .from('orders')
    .select('id', { count: 'exact', head: true })

  if (statusFilter !== 'all') {
    countQuery = countQuery.eq('status', statusFilter)
  }

  if (channelFilter !== 'all') {
    countQuery = countQuery.eq('sales_channel', channelFilter)
  }

  if (searchTerm) {
    const pattern = `%${searchTerm}%`
    const conditions = [
      `external_reference.ilike.${pattern}`,
      `guest_email.ilike.${pattern}`,
      `sold_to_name.ilike.${pattern}`,
      `payment_id.ilike.${pattern}`,
    ]

    if (UUID_REGEX.test(searchTerm)) {
      conditions.push(`id.eq.${searchTerm}`)
    }

    countQuery = countQuery.or(conditions.join(','))
  }

  const { count, error: countError } = await countQuery

  if (countError) {
    console.error('Error counting orders:', countError)
  }

  const totalItems = count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const currentPage = Math.min(requestedPage, totalPages)
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let ordersQuery = supa
    .from('orders')
    .select(`
      *,
      profiles:user_id (email, display_name),
      addresses:shipping_address_id (*),
      order_items (*)
    `)

  if (statusFilter !== 'all') {
    ordersQuery = ordersQuery.eq('status', statusFilter)
  }

  if (channelFilter !== 'all') {
    ordersQuery = ordersQuery.eq('sales_channel', channelFilter)
  }

  if (searchTerm) {
    const pattern = `%${searchTerm}%`
    const conditions = [
      `external_reference.ilike.${pattern}`,
      `guest_email.ilike.${pattern}`,
      `sold_to_name.ilike.${pattern}`,
      `payment_id.ilike.${pattern}`,
    ]

    if (UUID_REGEX.test(searchTerm)) {
      conditions.push(`id.eq.${searchTerm}`)
    }

    ordersQuery = ordersQuery.or(conditions.join(','))
  }

  const { data: orders, error: ordersError } = await ordersQuery
    .order('created_at', { ascending: false })
    .range(from, to)

  if (ordersError) {
    console.error('Error fetching orders:', ordersError)
    return <div className="p-6">Error al cargar pedidos</div>
  }

  const pageWindow = getPageWindow(currentPage, totalPages)
  const showingFrom = totalItems === 0 ? 0 : from + 1
  const showingTo = totalItems === 0 ? 0 : Math.min(to + 1, totalItems)

  return (
    <div className="p-4 space-y-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold sm:text-2xl">Pedidos</h1>
      </div>

      <Card className="p-4 space-y-3">
        <form method="get" className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_auto_auto]">
          <Input
            name="q"
            defaultValue={q}
            placeholder="Buscar por folio, UUID, email, nombre o payment ID"
          />

          <select
            name="status"
            defaultValue={statusFilter}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="all">Todos los estatus</option>
            <option value="created">Creado</option>
            <option value="pending_payment">Pendiente de pago</option>
            <option value="paid">Pagado</option>
            <option value="processing">Procesando</option>
            <option value="shipped">Enviado</option>
            <option value="delivered">Entregado</option>
            <option value="cancelled">Cancelado</option>
            <option value="refunded">Reembolsado</option>
          </select>

          <select
            name="channel"
            defaultValue={channelFilter}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="all">Todos los canales</option>
            <option value="online_mp">Online</option>
            <option value="physical_pos">POS</option>
          </select>

          <Button type="submit">Filtrar</Button>
          <Button asChild type="button" variant="outline">
            <Link href="/admin/orders">Limpiar</Link>
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">
          {totalItems === 0
            ? 'Sin resultados para los filtros actuales.'
            : `Mostrando ${showingFrom}-${showingTo} de ${totalItems} pedidos.`}
        </p>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-muted/50">
                <th className="p-3 font-medium">Pedido</th>
                <th className="p-3 font-medium">Cliente</th>
                <th className="p-3 font-medium">Fecha</th>
                <th className="p-3 font-medium">Estatus</th>
                <th className="p-3 font-medium">Entrega</th>
                <th className="p-3 font-medium">Canal</th>
                <th className="p-3 font-medium">Pago</th>
                <th className="p-3 font-medium text-right">Total</th>
                <th className="p-3 font-medium w-[50px]"></th>
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).map((order) => {
                const customerName =
                  order.profiles?.display_name ||
                  order.sold_to_name ||
                  order.addresses?.full_name ||
                  'Cliente invitado'

                const customerEmail =
                  order.profiles?.email || order.guest_email || 'Sin correo'

                const isPosSale = order.sales_channel === 'physical_pos'

                return (
                  <tr key={order.id} className="transition-colors border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">
                      {order.external_reference?.slice(0, 8) || order.id.slice(0, 8)}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{customerName}</div>
                      <div className="text-xs text-muted-foreground">{customerEmail}</div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {formatInMexicoCity(order.created_at, 'd MMM yyyy, HH:mm')}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          order.status === 'paid'
                            ? 'default'
                            : order.status === 'shipped'
                            ? 'secondary'
                            : order.status === 'delivered'
                            ? 'outline'
                            : order.status === 'cancelled'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={order.delivery_method === 'pickup' ? 'secondary' : 'outline'}
                      >
                        {order.delivery_method === 'pickup' ? 'Pick up' : 'Envío'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant={isPosSale ? 'default' : 'secondary'}>
                        {isPosSale ? 'POS' : 'Online'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`text-xs font-medium ${
                            isPosSale
                              ? 'text-blue-600'
                              : order.payment_status === 'approved'
                              ? 'text-green-600'
                              : order.payment_status === 'rejected'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                          }`}
                        >
                          {isPosSale
                            ? 'Registrado en tienda'
                            : order.payment_status || 'Pendiente'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-medium">
                      {formatMoney(order.total_cents)}
                    </td>
                    <td className="p-3">
                      <RowActions order={order} />
                    </td>
                  </tr>
                )
              })}

              {(!orders || orders.length === 0) && (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={9}>
                    No se encontraron pedidos con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {currentPage} de {totalPages}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {currentPage > 1 ? (
              <Button asChild size="sm" variant="outline">
                <Link
                  href={buildOrdersHref({
                    q,
                    status: statusFilter,
                    channel: channelFilter,
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
                  href={buildOrdersHref({
                    q,
                    status: statusFilter,
                    channel: channelFilter,
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
                  href={buildOrdersHref({
                    q,
                    status: statusFilter,
                    channel: channelFilter,
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
