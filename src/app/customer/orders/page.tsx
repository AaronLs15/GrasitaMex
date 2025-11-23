import { supabaseServer } from '@/lib/supabase/server'
import OrdersList from './orders-list'

export default async function OrdersPage() {
    const supa = await supabaseServer()
    const { data: { user } } = await supa.auth.getUser()

    if (!user) return null

    const { data: orders } = await supa
        .from('orders')
        .select(`
      *,
      addresses:shipping_address_id (*),
      order_items (*)
    `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Mis Pedidos</h1>
                <p className="text-muted-foreground">Historial de tus compras.</p>
            </div>

            <OrdersList orders={orders || []} />
        </div>
    )
}
