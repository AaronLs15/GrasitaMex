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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, Tag } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { formatMoney } from "@/lib/mercadopago";
import { AddressForm, type Address } from "@/components/checkout/AddressForm";
import { LoadingOverlay } from "@/components/checkout/LoadingOverlay";

export default function CheckoutPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { items, totalAmount, removeItem, clearCart } = useCart();
  const { toast } = useToast();
  const hasItems = items.length > 0;
  const [user, setUser] = useState<any>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const shipping = !hasItems || totalAmount >= 200000 ? 0 : 1500;
  const discount = appliedCoupon?.discountAmount ?? 0;
  const grandTotal = Math.max(0, totalAmount + shipping - discount);

  // Check auth
  useEffect(() => {
    const checkUser = async () => {
      const supa = supabaseBrowser();
      const { data } = await supa.auth.getUser();
      setUser(data.user);
    };
    checkUser();
  }, []);

  const handleCheckout = async () => {
    if (!user) {
      toast({
        title: "Debes iniciar sesión",
        description: "Por favor inicia sesión para continuar con tu compra.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedAddress) {
      toast({
        title: "Dirección requerida",
        description: "Por favor completa los datos de envío.",
        variant: "destructive",
      });
      return;
    }

    if (!acceptedTerms) {
      toast({
        title: "Términos y condiciones",
        description: "Debes aceptar los términos y condiciones para continuar.",
        variant: "destructive",
      });
      return;
    }

    if (!hasItems) return;

    setIsProcessing(true);
    try {
      // Formatear items para la API
      const formattedItems = items.map((item: any) => ({
        id: item.id,
        product_id: item.id,
        variant_id: item.variant_id || 0,
        sku: item.sku || `SKU-${item.id}`,
        title: item.title,
        size: item.size,
        price_cents: item.price_cents,
        quantity: item.quantity,
      }));

      const response = await fetch("/api/checkout/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: formattedItems,
          shipping_address: selectedAddress,
          coupon_code: appliedCoupon?.code || null,
          user_id: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al crear la preferencia");
      }

      // Redirigir directamente a MercadoPago
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        throw new Error("No se recibió la URL de pago");
      }
    } catch (error: any) {
      console.error("Error creating preference:", error);
      setIsProcessing(false);
      toast({
        title: "Error",
        description: error.message || "No se pudo procesar tu pedido.",
        variant: "destructive",
      });
    }
  };

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
          `Compra mínima de ${formatMoney(coupon.min_purchase_cents)} requerida.`
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
        description: `Se descontaron ${formatMoney(discountAmount)}.`,
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
    <>
      {isProcessing && <LoadingOverlay />}

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
                Completa tus datos de envío para continuar
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-6">
                {/* Items del carrito */}
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
                                {formatMoney(item.price_cents)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Subtotal: {formatMoney(lineTotal)}
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

                {/* Formulario de dirección */}
                {user && (
                  <AddressForm
                    userId={user.id}
                    onAddressChange={setSelectedAddress}
                  />
                )}
              </div>

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
                            Ahorras {formatMoney(appliedCoupon.discountAmount)}
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
                      <span>{formatMoney(totalAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Envío</span>
                      <span>{shipping === 0 ? "Gratis" : formatMoney(shipping)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex items-center justify-between text-sm text-primary">
                        <span>Descuento ({appliedCoupon.code})</span>
                        <span>-{formatMoney(appliedCoupon.discountAmount)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex items-center justify-between text-base font-semibold">
                      <span>Total</span>
                      <span>{formatMoney(grandTotal)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Envío gratis a partir de $2,000 MXN en productos.
                    </p>

                    {/* Términos y condiciones */}
                    <div className="flex items-start gap-2 pt-2">
                      <Checkbox
                        id="terms"
                        checked={acceptedTerms}
                        onCheckedChange={(checked) =>
                          setAcceptedTerms(checked as boolean)
                        }
                      />
                      <Label
                        htmlFor="terms"
                        className="text-sm font-normal leading-tight cursor-pointer"
                      >
                        Acepto los{" "}
                        <Link
                          href="/terminos"
                          className="text-primary hover:underline"
                          target="_blank"
                        >
                          términos y condiciones
                        </Link>
                      </Label>
                    </div>

                    {!user ? (
                      <Button asChild className="w-full rounded-xl">
                        <Link href="/login">Iniciar sesión para continuar</Link>
                      </Button>
                    ) : (
                      <Button
                        onClick={handleCheckout}
                        disabled={
                          !acceptedTerms ||
                          isProcessing ||
                          !selectedAddress
                        }
                        className="w-full rounded-xl"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          "Proceder al pago"
                        )}
                      </Button>
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
    </>
  );
}
