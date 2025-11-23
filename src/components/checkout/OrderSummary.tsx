// components/checkout/OrderSummary.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatMoney } from "@/lib/mercadopago";

interface OrderItem {
    id: number;
    title: string;
    size_label: string;
    quantity: number;
    unit_price_cents: number;
    line_total_cents: number;
}

interface Order {
    id: string;
    status: string;
    total_cents: number;
    currency: string;
    discount_amount_cents: number;
    coupon_code: string | null;
    created_at: string;
}

interface OrderSummaryProps {
    order: Order;
    items: OrderItem[];
    shippingCost?: number;
}

export function OrderSummary({ order, items, shippingCost = 0 }: OrderSummaryProps) {
    const subtotal = items.reduce((sum, item) => sum + item.line_total_cents, 0);

    return (
        <Card className="rounded-2xl">
            <CardHeader>
                <CardTitle className="text-lg">Resumen del Pedido</CardTitle>
                <p className="text-sm text-muted-foreground">
                    N° de orden:{" "}
                    <span className="font-mono font-medium">{order.id.slice(0, 8)}</span>
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-start justify-between text-sm"
                        >
                            <div className="flex-1">
                                <p className="font-medium">{item.title}</p>
                                <p className="text-muted-foreground">
                                    Talla: {item.size_label} × {item.quantity}
                                </p>
                            </div>
                            <p className="font-semibold">{formatMoney(item.line_total_cents)}</p>
                        </div>
                    ))}
                </div>

                <Separator />

                {/* Cálculos */}
                <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatMoney(subtotal)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Envío</span>
                        <span>
                            {shippingCost === 0 ? "Gratis" : formatMoney(shippingCost)}
                        </span>
                    </div>

                    {order.discount_amount_cents > 0 && (
                        <div className="flex items-center justify-between text-primary">
                            <span>
                                Descuento {order.coupon_code && `(${order.coupon_code})`}
                            </span>
                            <span>-{formatMoney(order.discount_amount_cents)}</span>
                        </div>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between text-base font-semibold">
                        <span>Total</span>
                        <span>{formatMoney(order.total_cents)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
