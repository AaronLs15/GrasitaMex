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

interface CustomerOrderDetailsProps {
    order: any;
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
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Dirección de Envío</h3>
                        <div className="bg-muted/40 p-3 rounded-lg text-sm space-y-1">
                            {shippingAddress ? (
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
                            {items.map((item: any) => (
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
                </div>
            </SheetContent>
        </Sheet>
    );
}
