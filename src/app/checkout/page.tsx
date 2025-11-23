"use client";

import Link from "next/link";
import HeadNavBar from "@/components/HeadNavBar";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, Tag } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";

const money = (cents: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format((cents ?? 0) / 100);

export default function CheckoutPage() {
  const [preferenceId, setPreferenceId] = useState<string>("null");
  const { items, totalAmount, removeItem } = useCart();
  const { toast } = useToast();
  const hasItems = items.length > 0;

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const shipping = !hasItems || totalAmount >= 200000 ? 0 : 1500; // MX$15 de envío si no alcanza el mínimo

  const discount = appliedCoupon?.discountAmount ?? 0;
  const grandTotal = Math.max(0, totalAmount + shipping - discount);

  initMercadoPago(process.env.NEXT_PUBLIC_MP_KEY!);

  const getPreference = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_LINK_PROYECTO}/api/mercadopago/create-preference`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: [
              {
                title: items[0].title,
                quantity: items[0].quantity,
                unit_price: items[0].price_cents,
              },
            ],
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        setPreferenceId(data.preference_id);
        console.log(data);
      }
    } catch (error) {
      console.error("error fetching", error);
    }
  };

  useEffect(() => {
    if (hasItems) {
      getPreference();
    }
  }, [hasItems]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    const supa = supabaseBrowser();

    try {
      const { data: coupon, error } = await supa
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("active", true)
        .single();

      if (error || !coupon) {
        toast({
          title: "Cupón inválido",
          description: "El código ingresado no existe o ha expirado.",
          variant: "destructive",
        });
        setAppliedCoupon(null);
        return;
      }

      // Validaciones extra
      const now = new Date();
      if (coupon.start_date && new Date(coupon.start_date) > now) {
        throw new Error("El cupón aún no está vigente.");
      }
      if (coupon.end_date && new Date(coupon.end_date) < now) {
        throw new Error("El cupón ha expirado.");
      }
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        throw new Error("Este cupón ha agotado sus usos.");
      }
      if (coupon.min_purchase_cents > totalAmount) {
        throw new Error(
          `Compra mínima de ${money(coupon.min_purchase_cents)} requerida.`
        );
      }

      // Calcular descuento
      let discountAmount = 0;
      if (coupon.discount_type === "percentage") {
        discountAmount = Math.round(
          (totalAmount * coupon.discount_value) / 100
        );
        if (coupon.max_discount_cents) {
          discountAmount = Math.min(discountAmount, coupon.max_discount_cents);
        }
      } else {
        discountAmount = coupon.discount_value * 100; // asumiendo que value viene en pesos si es fixed
        // Si en DB guardamos centavos para fixed, quitar * 100.
        // En el form guardamos directo el valor del input.
        // Si el input es "100 pesos", guardamos 100.
        // Ajuste: en form guardamos value tal cual.
        // Si es fixed_amount, asumimos que el valor ingresado son PESOS, así que convertimos a centavos aquí.
        // O mejor, estandarizar en DB.
        // Revisando form: discount_value se guarda directo.
        // Si es fixed, asumamos que son PESOS para el usuario, pero centavos para cálculos.
        // Vamos a asumir que discount_value para fixed es en PESOS.
        discountAmount = coupon.discount_value * 100;
      }

      // Tope al total
      discountAmount = Math.min(discountAmount, totalAmount);

      setAppliedCoupon({
        code: coupon.code,
        discountAmount,
      });

      toast({
        title: "Cupón aplicado",
        description: `Se descontaron ${money(discountAmount)}.`,
      });
    } catch (err: any) {
      toast({
        title: "No se pudo aplicar",
        description: err.message || "Error al validar el cupón.",
        variant: "destructive",
      });
      setAppliedCoupon(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const handleConfirm = () => {
    if (!hasItems) return;
    toast({
      title: "Procesando pago",
      description:
        "Integración pendiente: aquí conectarías tu pasarela (Mercado Pago, Stripe, etc.).",
    });
  };

  if (!hasItems) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <HeadNavBar />
        <main className="px-4 py-16 mx-auto max-w-3xl">
          <Card className="rounded-2xl">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl">Tu carrito está vacío</CardTitle>
              <CardDescription>
                Agrega artículos para poder iniciar el proceso de pago.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button asChild className="rounded-xl">
                <Link href="/modelos">Explorar modelos</Link>
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeadNavBar />
      <main className="px-4 py-10 mx-auto max-w-6xl">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">
              Checkout
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Revisa tu pedido antes de pagar
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Confirmaremos existencias por talla antes de enviarte al pago.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <section className="space-y-4">
              {items.map((item) => {
                const lineTotal = item.price_cents * item.quantity;
                return (
                  <Card
                    key={`${item.id}-${item.size}`}
                    className="rounded-2xl border bg-card/80"
                  >
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <p className="text-base font-semibold">{item.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Talla:{" "}
                          <span className="font-medium">{item.size}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Cantidad:{" "}
                          <span className="font-medium">{item.quantity}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-right">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Precio unitario
                          </p>
                          <p className="text-lg font-semibold">
                            {money(item.price_cents)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Subtotal: {money(lineTotal)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-sm text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.id, item.size)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </section>

            <aside className="space-y-6">
              {/* Cupón */}
              <Card className="rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Tag className="w-4 h-4" />
                    Cupón de descuento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-3 border border-dashed rounded-xl bg-primary/5 border-primary/30">
                      <div>
                        <p className="text-sm font-semibold text-primary">
                          {appliedCoupon.code}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Ahorras {money(appliedCoupon.discountAmount)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveCoupon}
                        className="h-8 text-xs hover:text-destructive"
                      >
                        Quitar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Código"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="uppercase"
                      />
                      <Button
                        variant="outline"
                        onClick={handleApplyCoupon}
                        disabled={validatingCoupon || !couponCode}
                      >
                        {validatingCoupon ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Aplicar"
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resumen */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Resumen</CardTitle>
                  <CardDescription>
                    Verifica montos antes de continuar al pago.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Productos</span>
                    <span>{money(totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Envío</span>
                    <span>{shipping === 0 ? "Gratis" : money(shipping)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex items-center justify-between text-sm text-primary">
                      <span>Descuento ({appliedCoupon.code})</span>
                      <span>-{money(appliedCoupon.discountAmount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{money(grandTotal)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Envío gratis a partir de $2,000 MXN en productos.
                  </p>
                  {preferenceId && (
                    
                  <Wallet initialization={{ preferenceId: preferenceId }} />
                    
                  )}
                  <Button
                    asChild
                    variant="outline"
                    className="w-full rounded-xl"
                  >
                    <Link href="/modelos">Seguir comprando</Link>
                  </Button>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
