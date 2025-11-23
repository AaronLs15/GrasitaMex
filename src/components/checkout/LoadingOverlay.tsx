// components/checkout/LoadingOverlay.tsx
"use client";

import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface LoadingOverlayProps {
    message?: string;
    subMessage?: string;
}

export function LoadingOverlay({
    message = "Procesando tu pedido...",
    subMessage = "Serás redirigido a MercadoPago en un momento",
}: LoadingOverlayProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <Card className="w-full max-w-md mx-4 rounded-2xl">
                <CardContent className="flex flex-col items-center gap-6 py-12">
                    <div className="relative">
                        <div className="absolute inset-0 animate-ping">
                            <Loader2 className="w-16 h-16 text-primary/30" />
                        </div>
                        <Loader2 className="relative w-16 h-16 text-primary animate-spin" />
                    </div>

                    <div className="space-y-2 text-center">
                        <h3 className="text-xl font-semibold">{message}</h3>
                        <p className="text-sm text-muted-foreground">{subMessage}</p>
                    </div>

                    <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
