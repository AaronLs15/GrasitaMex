"use client";

import HeadNavBar from "@/components/HeadNavBar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DevolucionesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeadNavBar />
      <main className="px-4 py-12 mx-auto max-w-4xl">
        <div className="space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold">Devoluciones</h1>
            <p className="text-sm text-muted-foreground">
              Politica y proceso para devoluciones.
            </p>
          </header>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Condiciones</CardTitle>
              <CardDescription>Para poder procesar tu devolucion.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Solicita la devolucion dentro de los primeros 7 dias naturales.</p>
              <p>El producto debe estar sin uso y con empaque original.</p>
              <p>Conserva el comprobante de compra y el # de orden.</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Proceso</CardTitle>
              <CardDescription>Te guiaremos paso a paso.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Escribe a soporte con tu numero de orden y motivo.</p>
              <p>Validaremos la solicitud y enviaremos instrucciones.</p>
              <p>Una vez recibido y revisado, te confirmaremos el reembolso.</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Contacto de soporte</CardTitle>
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
