"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, ShoppingBag } from "lucide-react";
import { formatMoney } from "@/lib/mercadopago";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CustomerOrderDetails } from "./customer-order-details";

interface OrdersListProps {
    orders: any[];
}

export default function OrdersList({ orders }: OrdersListProps) {
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const openDetails = (order: any) => {
        setSelectedOrder(order);
        setIsDetailsOpen(true);
    };

    if (!orders || orders.length === 0) {
        return (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No tienes pedidos aún</h3>
                <p className="text-muted-foreground">¡Explora nuestros productos y realiza tu primera compra!</p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-4">
                {orders.map((order) => (
                    <Card key={order.id} className="overflow-hidden">
                        <CardContent className="p-0">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-medium">
                                            #{order.external_reference?.slice(0, 8) || order.id.slice(0, 8)}
                                        </span>
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
                                    <p className="text-sm text-muted-foreground">
                                        {format(new Date(order.created_at), "PPP 'a las' p", { locale: es })}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto">
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Total</p>
                                        <p className="font-bold">{formatMoney(order.total_cents)}</p>
                                    </div>

                                    <Button variant="outline" size="sm" onClick={() => openDetails(order)}>
                                        <Eye className="w-4 h-4 mr-2" />
                                        Ver Detalles
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <CustomerOrderDetails
                order={selectedOrder}
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
            />
        </>
    );
}
