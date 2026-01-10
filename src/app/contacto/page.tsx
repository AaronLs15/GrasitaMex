"use client";

import HeadNavBar from "@/components/HeadNavBar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ContactoPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeadNavBar />
      <main className="px-4 py-12 mx-auto max-w-4xl">
        <div className="space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold">Contacto</h1>
            <p className="text-sm text-muted-foreground">
              Estamos listos para ayudarte con tu pedido.
            </p>
          </header>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Atencion al cliente</CardTitle>
              <CardDescription>Resolvemos dudas y seguimiento de pedidos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="text-xs text-muted-foreground">Correo</p>
                <a className="font-medium hover:underline" href="mailto:ventas@grasitamex.com">
                  ventas@grasitamex.com
                </a>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <a
                  className="font-medium hover:underline"
                  href="https://wa.me/523311840501"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  +52 33 1184 0501
                </a>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild className="rounded-xl">
                  <a href="mailto:ventas@grasitamex.com">Escribir correo</a>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <a
                    href="https://wa.me/523311840501"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
