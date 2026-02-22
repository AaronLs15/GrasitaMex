// app/checkout/failure/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
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
import { XCircle, RefreshCcw, Loader2, AlertTriangle } from "lucide-react";
import {
    fetchPublicOrderSummary,
    resolvePublicOrderLookup,
    type PublicOrderData,
} from "@/lib/checkout/public-order";

function FailureContent() {
    const searchParams = useSearchParams();
    const [orderData, setOrderData] = useState<PublicOrderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    const handleRetry = () => {
        if (orderData?.order?.preference_id) {
            // Redirigir al usuario de vuelta a MercadoPago usando el mismo preference_id
            window.location.href = `https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=${orderData.order.preference_id}`;
        } else {
            // Si no hay preference_id, redirigir al checkout
            window.location.href = "/checkout";
        }
    };

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
                                <Link href="/checkout">Volver al checkout</Link>
                            </Button>
                            <Button asChild variant="outline" className="rounded-xl">
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

    // Determinar el mensaje de error según el status_detail
    const errorMessage = "El pago no pudo ser procesado.";
    let errorDetail = "Por favor, intenta nuevamente o usa otro método de pago.";

    if (order.payment_status === "rejected") {
        switch (order.payment_status_detail) {
            case "cc_rejected_bad_filled_card_number":
                errorDetail = "El número de tarjeta es inválido. Verifica los datos.";
                break;
            case "cc_rejected_bad_filled_date":
                errorDetail = "La fecha de vencimiento es inválida.";
                break;
            case "cc_rejected_bad_filled_security_code":
                errorDetail = "El código de seguridad es inválido.";
                break;
            case "cc_rejected_insufficient_amount":
                errorDetail = "Tu tarjeta no tiene fondos suficientes.";
                break;
            case "cc_rejected_high_risk":
                errorDetail = "El pago fue rechazado por políticas de seguridad.";
                break;
            case "cc_rejected_call_for_authorize":
                errorDetail = "Debes autorizar el pago con tu banco.";
                break;
            default:
                errorDetail = "El banco no autorizó el pago. Intenta con otra tarjeta.";
        }
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <HeadNavBar />
            <main className="px-4 py-16 mx-auto max-w-4xl">
                <div className="space-y-8">
                    {/* Error Message */}
                    <Card className="border-destructive/20 bg-destructive/5 rounded-2xl">
                        <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:text-left">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
                                <XCircle className="w-8 h-8 text-destructive" />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-2xl font-bold text-destructive">
                                    {errorMessage}
                                </h1>
                                <p className="mt-1 text-muted-foreground">{errorDetail}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Info Cards */}
                    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                        <div className="space-y-6">
                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5" />
                                        Razones comunes de rechazo
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <span className="shrink-0">•</span>
                                            <p className="text-muted-foreground">
                                                <span className="font-medium text-foreground">
                                                    Fondos insuficientes:
                                                </span>{" "}
                                                Verifica el saldo disponible en tu cuenta
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="shrink-0">•</span>
                                            <p className="text-muted-foreground">
                                                <span className="font-medium text-foreground">
                                                    Límite de compra:
                                                </span>{" "}
                                                Tu tarjeta puede tener límites diarios o mensuales
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="shrink-0">•</span>
                                            <p className="text-muted-foreground">
                                                <span className="font-medium text-foreground">
                                                    Datos incorrectos:
                                                </span>{" "}
                                                Verifica el número, fecha de vencimiento y CVV
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="shrink-0">•</span>
                                            <p className="text-muted-foreground">
                                                <span className="font-medium text-foreground">
                                                    Seguridad bancaria:
                                                </span>{" "}
                                                El banco puede requerir validación adicional
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl">
                                <CardHeader>
                                    <CardTitle>¿Necesitas ayuda?</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <p className="text-muted-foreground">
                                        Si el problema persiste o tienes dudas, contáctanos:
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
                        <Button onClick={handleRetry} className="rounded-xl">
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            Reintentar pago
                        </Button>
                        <Button asChild variant="outline" className="rounded-xl">
                            <Link href="/checkout">Modificar método de pago</Link>
                        </Button>
                        <Button asChild variant="ghost" className="rounded-xl">
                            <Link href="/">Volver al inicio</Link>
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function FailurePage() {
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
            <FailureContent />
        </Suspense>
    );
}
