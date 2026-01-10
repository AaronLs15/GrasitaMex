"use client";

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatMoney } from "@/lib/mercadopago";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type OrderItem = {
    id: string | number;
    title: string;
    size_label?: string | null;
    quantity: number;
    line_total_cents: number;
    unit_price_cents: number;
};

type OrderDetails = {
    id: string;
    external_reference?: string | null;
    status: string;
    created_at: string;
    total_cents: number;
    discount_amount_cents?: number | null;
    coupon_code?: string | null;
    payment_status?: string | null;
    payment_id?: string | null;
    preference_id?: string | null;
    delivery_method?: 'shipment' | 'pickup';
    profiles?: { display_name?: string | null; email?: string | null };
    addresses?: {
        full_name?: string | null;
        line1?: string | null;
        line2?: string | null;
        city?: string | null;
        state?: string | null;
        zip?: string | null;
        country?: string | null;
        phone?: string | null;
        reference?: string | null;
    } | null;
    order_items?: OrderItem[];
};

interface OrderDetailsSheetProps {
    order: OrderDetails | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function OrderDetailsSheet({
    order,
    open,
    onOpenChange,
}: OrderDetailsSheetProps) {
    if (!order) return null;

    const shippingAddress = order.addresses; // Relación shipping_address_id
    const items = order.order_items || [];
    const isPickup = order.delivery_method === 'pickup';

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader className="mb-6">
                    <div className="flex items-center justify-between">
                        <SheetTitle>Pedido #{order.external_reference?.slice(0, 8) || order.id.slice(0, 8)}</SheetTitle>
                        <Badge variant={
                            order.status === 'paid' ? 'default' :
                                order.status === 'shipped' ? 'secondary' :
                                    order.status === 'delivered' ? 'outline' :
                                        'destructive'
                        }>
                            {order.status}
                        </Badge>
                    </div>
                    <SheetDescription>
                        Realizado el {format(new Date(order.created_at), "PPP 'a las' p", { locale: es })}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                    {/* Cliente */}
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Cliente</h3>
                        <div className="bg-muted/40 p-3 rounded-lg text-sm">
                            <p className="font-medium">{order.profiles?.display_name || 'Sin nombre'}</p>
                            <p className="text-muted-foreground">{order.profiles?.email}</p>
                        </div>
                    </div>

                    {/* Dirección de Envío */}
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                            {isPickup ? 'Pick up' : 'Dirección de Envío'}
                        </h3>
                        <div className="bg-muted/40 p-3 rounded-lg text-sm space-y-1">
                            {isPickup ? (
                                <>
                                    <p className="font-medium">Recoge tu par en:</p>
                                    <p>Calle Plazoleta B 156, Colonia San Andres</p>
                                    <p>CP 44730, Guadalajara, Jalisco.</p>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Presenta tu # de orden o el correo de confirmacion del pedido.
                                    </p>
                                </>
                            ) : shippingAddress ? (
                                <>
                                    <p className="font-medium">{shippingAddress.full_name}</p>
                                    <p>{shippingAddress.line1}</p>
                                    {shippingAddress.line2 && <p>{shippingAddress.line2}</p>}
                                    <p>
                                        {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}
                                    </p>
                                    <p>{shippingAddress.country}</p>
                                    <p className="mt-2 text-muted-foreground">Tel: {shippingAddress.phone}</p>
                                    {shippingAddress.reference && (
                                        <p className="text-xs text-muted-foreground mt-1">Ref: {shippingAddress.reference}</p>
                                    )}
                                </>
                            ) : (
                                <p className="text-destructive">Dirección no encontrada</p>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Productos */}
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Productos ({items.length})</h3>
                        <div className="space-y-3">
                            {items.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <div className="flex-1">
                                        <p className="font-medium">{item.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Talla: {item.size_label} | Cant: {item.quantity}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p>{formatMoney(item.line_total_cents)}</p>
                                        {item.quantity > 1 && (
                                            <p className="text-xs text-muted-foreground">
                                                {formatMoney(item.unit_price_cents)} c/u
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Totales */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatMoney(order.total_cents + (order.discount_amount_cents || 0))}</span>
                        </div>

                        {order.discount_amount_cents > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Descuento ({order.coupon_code})</span>
                                <span>-{formatMoney(order.discount_amount_cents)}</span>
                            </div>
                        )}

                        <div className="flex justify-between text-base font-bold pt-2">
                            <span>Total</span>
                            <span>{formatMoney(order.total_cents)}</span>
                        </div>
                    </div>

                    {/* Info de Pago */}
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-xs space-y-1">
                        <p className="font-medium text-blue-700 dark:text-blue-400">Información de Pago</p>
                        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                            <span>Status MP:</span>
                            <span className="font-mono">{order.payment_status || '-'}</span>
                            <span>Payment ID:</span>
                            <span className="font-mono">{order.payment_id || '-'}</span>
                            <span>Preference:</span>
                            <span className="font-mono truncate">{order.preference_id || '-'}</span>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
