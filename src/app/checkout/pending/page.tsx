// app/checkout/pending/page.tsx
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
import { Clock, AlertCircle, Loader2 } from "lucide-react";
import { useCart } from "@/context/cart-context";
import {
    fetchPublicOrderSummary,
    resolvePublicOrderLookup,
    type PublicOrderData,
} from "@/lib/checkout/public-order";

function PendingContent() {
    const searchParams = useSearchParams();
    const [orderData, setOrderData] = useState<PublicOrderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { clearCart } = useCart();
    const clearedRef = useRef(false);

    useEffect(() => {
        const fetchOrder = async () => {
            const lookup = resolvePublicOrderLookup(searchParams);
            const { data, error: fetchError } = await fetchPublicOrderSummary(lookup);

            if (fetchError || !data) {
                setError(fetchError || "No se pudo verificar el pago");
                setLoading(false);
                return;
            }

            setOrderData(data);
            setLoading(false);
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
                                Verificando el estado de tu pago...
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

    const { order, items } = orderData;
    const isPickup = order.delivery_method
        ? order.delivery_method === "pickup"
        : !order.shipping_address_id;
    const shippingCost = isPickup ? 0 : 15000;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <HeadNavBar />
            <main className="px-4 py-16 mx-auto max-w-4xl">
                <div className="space-y-8">
                    {/* Pending Message */}
                    <Card className="border-yellow-500/20 bg-yellow-500/5 rounded-2xl">
                        <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:text-left">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/10">
                                <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-2xl font-bold text-yellow-700 dark:text-yellow-500">
                                    Pago pendiente
                                </h1>
                                <p className="mt-1 text-muted-foreground">
                                    Tu pago está siendo procesado. Esto puede tomar algunos
                                    minutos o días dependiendo del método de pago.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Info Cards */}
                    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                        <div className="space-y-6">
                            {isPickup && (
                                <Card className="rounded-2xl">
                                    <CardHeader>
                                        <CardTitle>Pick up</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <p className="font-semibold">
                                            Recoge tu par en:
                                        </p>
                                        <p className="text-muted-foreground">
                                            Calle Plazoleta B 156, Colonia San Andres,
                                            CP 44730, Guadalajara, Jalisco.
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Presenta tu # de orden o el correo de confirmacion
                                            del pedido.
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5" />
                                        ¿Qué significa esto?
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <div>
                                        <h3 className="font-semibold mb-1">
                                            Métodos de pago en efectivo
                                        </h3>
                                        <p className="text-muted-foreground">
                                            Si elegiste pagar en OXXO, 7-Eleven u otro método en
                                            efectivo, recibirás un correo con las instrucciones de
                                            pago. Una vez que realices el pago, tu orden será
                                            confirmada automáticamente.
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-1">
                                            Transferencias bancarias
                                        </h3>
                                        <p className="text-muted-foreground">
                                            Las transferencias pueden tardar hasta 48 horas hábiles en
                                            ser procesadas por el banco.
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-1">Tarjeta de débito/crédito</h3>
                                        <p className="text-muted-foreground">
                                            Algunos bancos requieren validación adicional. Verifica tu
                                            correo o app bancaria para completar la autorización.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle>¿Necesitas ayuda?</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <p className="text-muted-foreground">
                                        Si tienes dudas sobre tu pago o necesitas asistencia,
                                        contáctanos:
                                    </p>
                                    <div className="space-y-1">
                                        <p>
                                            <span className="font-medium">Email:</span>{" "}
                                            <a
                                                href="mailto:ventas@grasitamex.com"
                                                className="text-primary hover:underline"
                                            >
                                                ventas@grasitamex.com
                                            </a>
                                        </p>
                                        <p>
                                            <span className="font-medium">WhatsApp:</span>{" "}
                                            <a
                                                href="https://wa.me/523311840501"
                                                className="text-primary hover:underline"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                +52 33 1184 0501
                                            </a>
                                        </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Ten a la mano tu número de orden:{" "}
                                        <span className="font-mono font-medium">
                                            {order.id.slice(0, 8)}
                                        </span>
                                    </p>
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

export default function PendingPage() {
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
            <PendingContent />
        </Suspense>
    );
}
