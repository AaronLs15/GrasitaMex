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

const money = (cents: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format((cents ?? 0) / 100);

export default function CheckoutPage() {
  const { items, totalAmount, removeItem } = useCart();
  const { toast } = useToast();
  const hasItems = items.length > 0;
  const shipping =
    !hasItems || totalAmount >= 200000
      ? 0
      : 1500; // MX$15 de envío si no alcanza el mínimo
  const grandTotal = totalAmount + shipping;

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
                          Talla: <span className="font-medium">{item.size}</span>
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

            <aside>
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
                  <Separator />
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{money(grandTotal)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Envío gratis a partir de $2,000 MXN en productos.
                  </p>
                  <Button
                    className="w-full rounded-xl"
                    onClick={handleConfirm}
                  >
                    Confirmar y proceder al pago
                  </Button>
                  <Button asChild variant="outline" className="w-full rounded-xl">
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
