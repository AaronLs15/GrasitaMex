"use client";

import HeadNavBar from "@/components/HeadNavBar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function EnviosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeadNavBar />
      <main className="px-4 py-12 mx-auto max-w-4xl">
        <div className="space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold">Soporte de envios</h1>
            <p className="text-sm text-muted-foreground">
              Informacion sobre costos, tiempos y cobertura.
            </p>
          </header>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Costos de envio</CardTitle>
              <CardDescription>Aplican solo para envio a domicilio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Envio estandar: $150.00 MXN si el subtotal es menor a $2,000 MXN.</p>
              <p>Pick up disponible sin costo adicional.</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Tiempos de entrega</CardTitle>
              <CardDescription>Los tiempos pueden variar por zona.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Procesamiento: 1-2 dias habiles despues de confirmar el pago.</p>
              <p>Entrega estimada: 2-5 dias habiles (interior de la republica).</p>
              <p>Te enviaremos el numero de guia cuando tu pedido sea enviado.</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Pick up</CardTitle>
              <CardDescription>Disponible en Guadalajara, Jalisco.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Calle Plazoleta B 156, Colonia San Andres, CP 44730.</p>
              <p>Guadalajara, Jalisco.</p>
              <p>
                Presenta tu # de orden o el correo de confirmacion para recoger
                tu par.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
