"use client";

import HeadNavBar from "@/components/HeadNavBar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeadNavBar />
      <main className="px-4 py-12 mx-auto max-w-4xl">
        <div className="space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold">Terminos y condiciones</h1>
            <p className="text-sm text-muted-foreground">
              Al comprar en GrasitaMex aceptas los siguientes terminos.
            </p>
          </header>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Compra y pagos</CardTitle>
              <CardDescription>Condiciones generales de compra.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Los precios estan expresados en MXN e incluyen impuestos aplicables.</p>
              <p>Los pagos se procesan mediante Mercado Pago.</p>
              <p>La confirmacion de tu pedido depende de la aprobacion del pago.</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Envios y pick up</CardTitle>
              <CardDescription>Entrega a domicilio o recoleccion.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>El envio aplica segun la cobertura y costos publicados en la tienda.</p>
              <p>Pick up disponible en Guadalajara, Jalisco.</p>
              <p>Para recoger es necesario presentar el # de orden o correo de confirmacion.</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Devoluciones</CardTitle>
              <CardDescription>Consulta los tiempos y condiciones.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Las devoluciones se solicitan dentro de los 7 dias naturales.</p>
              <p>El producto debe estar sin uso y con empaque original.</p>
              <p>Los reembolsos se procesan tras validar el estado del articulo.</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Soporte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Correo:{" "}
                <a className="font-medium hover:underline" href="mailto:ventas@grasitamex.com">
                  ventas@grasitamex.com
                </a>
              </p>
              <p>
                WhatsApp:{" "}
                <a
                  className="font-medium hover:underline"
                  href="https://wa.me/523311840501"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  +52 33 1184 0501
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
