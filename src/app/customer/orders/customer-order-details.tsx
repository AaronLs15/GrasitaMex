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

type CustomerOrder = {
    id: string;
    external_reference?: string | null;
    status: string;
    created_at: string;
    total_cents: number;
    discount_amount_cents?: number | null;
    coupon_code?: string | null;
    delivery_method?: 'shipment' | 'pickup';
    shipping_address_id?: number | null;
    addresses?: {
        full_name?: string | null;
        line1?: string | null;
        line2?: string | null;
        city?: string | null;
        state?: string | null;
        zip?: string | null;
        phone?: string | null;
    } | null;
    order_items?: OrderItem[];
};

interface CustomerOrderDetailsProps {
    order: CustomerOrder | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CustomerOrderDetails({
    order,
    open,
    onOpenChange,
}: CustomerOrderDetailsProps) {
    if (!order) return null;

    const shippingAddress = order.addresses;
    const items = order.order_items || [];
    const discountCents = order.discount_amount_cents ?? 0;
    const isPickup = order.delivery_method
        ? order.delivery_method === 'pickup'
        : !order.shipping_address_id;
    const itemsSubtotalCents = items.reduce((sum, item) => sum + item.line_total_cents, 0);
    const shippingCostCents = isPickup ? 0 : 15000;
    const subtotalCents = itemsSubtotalCents + shippingCostCents;
    const totalCents = Math.max(0, subtotalCents - discountCents);

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
                            {order.status === 'paid' ? 'Pagado' :
                                order.status === 'shipped' ? 'Enviado' :
                                    order.status === 'delivered' ? 'Entregado' :
                                        order.status === 'cancelled' ? 'Cancelado' :
                                            order.status}
                        </Badge>
                    </div>
                    <SheetDescription>
                        Realizado el {format(new Date(order.created_at), "PPP 'a las' p", { locale: es })}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
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
                                    <p className="mt-2 text-muted-foreground">Tel: {shippingAddress.phone}</p>
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
                            <span className="text-muted-foreground">Método de entrega</span>
                            <span>{isPickup ? 'Pick up' : 'Envío'}</span>
                        </div>

                        {!isPickup && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Envío</span>
                                <span>{shippingCostCents === 0 ? 'Gratis' : formatMoney(shippingCostCents)}</span>
                            </div>
                        )}

                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatMoney(subtotalCents)}</span>
                        </div>

                        {discountCents > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Descuento ({order.coupon_code})</span>
                                <span>-{formatMoney(discountCents)}</span>
                            </div>
                        )}

                        <div className="flex justify-between text-base font-bold pt-2">
                            <span>Total</span>
                            <span>{formatMoney(totalCents)}</span>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
