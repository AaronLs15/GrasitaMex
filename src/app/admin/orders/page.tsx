import { supabaseServer } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/mercadopago';
import { formatInMexicoCity } from '@/lib/dates';
import RowActions from './row-actions';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
    const supa = await supabaseServer();

    const { data: orders, error } = await supa
        .from('orders')
        .select(`
      *,
      profiles:user_id (email, display_name),
      addresses:shipping_address_id (*),
      order_items (*)
    `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching orders:', error);
        return <div>Error al cargar pedidos</div>;
    }

    return (
        <div className="p-4 space-y-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-xl font-semibold sm:text-2xl">Pedidos</h1>
            </div>

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
                                <th className="p-3 font-medium">Pago</th>
                                <th className="p-3 font-medium text-right">Total</th>
                                <th className="p-3 font-medium w-[50px]"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {(orders ?? []).map((order) => (
                                <tr key={order.id} className="transition-colors border-t hover:bg-muted/30">
                                    <td className="p-3 font-mono text-xs">
                                        {order.external_reference?.slice(0, 8) || order.id.slice(0, 8)}
                                    </td>
                                    <td className="p-3">
                                        <div className="font-medium">
                                            {order.profiles?.display_name || 'Sin nombre'}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {order.profiles?.email}
                                        </div>
                                    </td>
                                    <td className="p-3 text-muted-foreground">
                                        {formatInMexicoCity(order.created_at, "d MMM yyyy, HH:mm")}
                                    </td>
                                    <td className="p-3">
                                        <Badge variant={
                                            order.status === 'paid' ? 'default' :
                                                order.status === 'shipped' ? 'secondary' :
                                                    order.status === 'delivered' ? 'outline' :
                                                        order.status === 'cancelled' ? 'destructive' :
                                                            'secondary'
                                        }>
                                            {order.status}
                                        </Badge>
                                    </td>
                                    <td className="p-3">
                                        <Badge variant={order.delivery_method === 'pickup' ? 'secondary' : 'outline'}>
                                            {order.delivery_method === 'pickup' ? 'Pick up' : 'Envío'}
                                        </Badge>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-xs font-medium ${order.payment_status === 'approved' ? 'text-green-600' :
                                                    order.payment_status === 'rejected' ? 'text-red-600' :
                                                        'text-yellow-600'
                                                }`}>
                                                {order.payment_status || 'Pendiente'}
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
                            ))}
                            {(!orders || orders.length === 0) && (
                                <tr>
                                    <td className="p-6 text-center text-muted-foreground" colSpan={8}>
                                        No hay pedidos registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
