// app/checkout/success/page.tsx
"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import HeadNavBar from "@/components/HeadNavBar";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { CheckCircle2, Package, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCart } from "@/context/cart-context";

type OrderItem = {
    line_total_cents: number;
};

type OrderAddress = {
    full_name?: string | null;
    phone?: string | null;
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    reference?: string | null;
};

type SuccessOrder = {
    id: string;
    external_reference?: string | null;
    status: string;
    total_cents: number;
    created_at: string;
    shipping_address_id?: number | null;
    order_items?: OrderItem[];
};

interface OrderData {
    order: SuccessOrder;
    items: OrderItem[];
    address: OrderAddress | null;
}

function SuccessContent() {
    const searchParams = useSearchParams();
    const [orderData, setOrderData] = useState<OrderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { clearCart } = useCart();
    const clearedRef = useRef(false);

    useEffect(() => {
        const fetchOrder = async () => {
            // MercadoPago envía external_reference en la URL
            const externalRef =
                searchParams.get("external_reference") ||
                searchParams.get("preference_id");

            if (!externalRef) {
                setError("No se encontró la referencia de la orden");
                setLoading(false);
                return;
            }

            try {
                const supa = supabaseBrowser();

                // Buscar orden por external_reference o por preference_id
                const query = supa
                    .from("orders")
                    .select(
                        `
            *,
            order_items(*),
            addresses!orders_shipping_address_id_fkey(*)
          `
                    );
                // .eq("status", "paid"); // Eliminamos filtro para manejar otros estados

                // Intentar primero con external_reference
                let { data: order } = await query.eq("id", externalRef).single();

                // Si no funciona, intentar con preference_id
                if (!order) {
                    const result = await query.eq("preference_id", externalRef).single();
                    order = result.data;
                }

                if (!order) {
                    setError("Orden no encontrada o aún no confirmada");
                    setLoading(false);
                    return;
                }

                setOrderData({
                    order,
                    items: order.order_items || [],
                    address: order.addresses || null,
                });
            } catch (err) {
                console.error("Error fetching order:", err);
                setError("Error al cargar los detalles de la orden");
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [searchParams]);

    useEffect(() => {
        if (!orderData || clearedRef.current) return;
        if (orderData.order?.status === "paid") {
            clearCart();
            clearedRef.current = true;
        }
    }, [orderData, clearCart]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <HeadNavBar />
                <main className="flex items-center justify-center px-4 py-24">
                    <Card className="w-full max-w-md rounded-2xl">
                        <CardContent className="flex flex-col items-center gap-4 pt-6">
                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            <p className="text-muted-foreground">
                                Verificando tu pago...
                            </p>
                        </CardContent>
                    </Card>
                </main>
            </div>
        );
    }

    if (error || !orderData) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <HeadNavBar />
                <main className="px-4 py-16 mx-auto max-w-3xl">
                    <Card className="rounded-2xl">
                        <CardHeader className="space-y-1 text-center">
                            <CardTitle className="text-2xl">
                                No se pudo verificar el pago
                            </CardTitle>
                            <CardDescription>{error || "Error desconocido"}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                            <Button asChild className="rounded-xl">
                                <Link href="/">Volver al inicio</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </main>
            </div>
        );
    }

    const { order, items, address } = orderData;
    const isPickup = !order.shipping_address_id;

    // Calcular costo de envío
    const subtotal = items.reduce((sum, item) => sum + item.line_total_cents, 0);
    const shippingCost = isPickup ? 0 : subtotal >= 200000 ? 0 : 1500;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <HeadNavBar />
            <main className="px-4 py-16 mx-auto max-w-4xl">
                <div className="space-y-8">
                    {/* Status Message */}
                    <Card className={`border-primary/20 rounded-2xl ${order.status === 'paid' ? 'bg-primary/5' : 'bg-yellow-500/10'}`}>
                        <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:text-left">
                            <div className={`flex items-center justify-center w-16 h-16 rounded-full ${order.status === 'paid' ? 'bg-primary/10' : 'bg-yellow-500/20'}`}>
                                {order.status === 'paid' ? (
                                    <CheckCircle2 className="w-8 h-8 text-primary" />
                                ) : (
                                    <Loader2 className="w-8 h-8 text-yellow-600 animate-spin" />
                                )}
                            </div>
                            <div className="flex-1">
                                <h1 className={`text-2xl font-bold ${order.status === 'paid' ? 'text-primary' : 'text-yellow-700'}`}>
                                    {order.status === 'paid' ? '¡Pago confirmado!' : 'Pago en proceso'}
                                </h1>
                                <p className="mt-1 text-muted-foreground">
                                    {order.status === 'paid'
                                        ? 'Tu pedido ha sido recibido y está siendo procesado. Recibirás un correo de confirmación en breve.'
                                        : 'Estamos verificando tu pago. Esto puede tomar unos minutos. Te notificaremos cuando se confirme.'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Order Details */}
                    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                        {/* Shipping Info */}
                        <div className="space-y-6">
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Package className="w-5 h-5" />
                                        {isPickup ? "Pick up" : "Información de Envío"}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    {isPickup ? (
                                        <div className="space-y-2">
                                            <p className="font-semibold">
                                                Recoge tu par en:
                                            </p>
                                            <div className="text-muted-foreground">
                                                Calle Plazoleta B 156, Colonia San Andres,
                                                CP 44730, Guadalajara, Jalisco.
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Presenta tu # de orden o el correo de confirmación
                                                del pedido.
                                            </p>
                                        </div>
                                    ) : address ? (
                                        <>
                                            <div>
                                                <p className="font-semibold">{address.full_name}</p>
                                                <p className="text-muted-foreground">{address.phone}</p>
                                            </div>
                                            <div className="text-muted-foreground">
                                                <p>{address.line1}</p>
                                                {address.line2 && <p>{address.line2}</p>}
                                                <p>
                                                    {address.city}, {address.state} {address.zip}
                                                </p>
                                                {address.reference && (
                                                    <p className="mt-2 italic">
                                                        Referencia: {address.reference}
                                                    </p>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-muted-foreground">
                                            No hay información de envío disponible
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle>¿Qué sigue?</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div className="flex gap-3">
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 bg-primary/10 text-primary">
                                            1
                                        </div>
                                        <div>
                                            <p className="font-medium">Preparación</p>
                                            <p className="text-muted-foreground">
                                                Verificaremos tu pedido y lo prepararemos para envío
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 bg-primary/10 text-primary">
                                            2
                                        </div>
                                        <div>
                                            <p className="font-medium">
                                                {isPickup ? "Pick up" : "Envío"}
                                            </p>
                                            <p className="text-muted-foreground">
                                                {isPickup
                                                    ? "Te avisaremos cuando puedas pasar por tu pedido"
                                                    : "Te enviaremos el número de guía de rastreo"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full shrink-0 bg-primary/10 text-primary">
                                            3
                                        </div>
                                        <div>
                                            <p className="font-medium">
                                                {isPickup ? "Entrega en punto" : "Entrega"}
                                            </p>
                                            <p className="text-muted-foreground">
                                                {isPickup
                                                    ? "Presenta tu # de orden al recoger"
                                                    : "Recibirás tu pedido en la dirección indicada"}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Order Summary */}
                        <div>
                            <OrderSummary
                                order={order}
                                items={items}
                                shippingCost={shippingCost}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <Button asChild className="rounded-xl">
                            <Link href="/modelos">Seguir comprando</Link>
                        </Button>
                        <Button asChild variant="outline" className="rounded-xl">
                            <Link href="/">Volver al inicio</Link>
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-background text-foreground">
                    <HeadNavBar />
                    <main className="flex items-center justify-center px-4 py-24">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    </main>
                </div>
            }
        >
            <SuccessContent />
        </Suspense>
    );
}
