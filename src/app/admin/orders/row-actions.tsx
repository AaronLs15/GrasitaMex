"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Truck, CheckCircle, XCircle, Clock } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { OrderDetailsSheet } from "./order-details-sheet";

interface RowActionsProps {
    order: any;
}

const ORDER_STATUSES = [
    { value: 'created', label: 'Creado', icon: Clock },
    { value: 'pending_payment', label: 'Pendiente de Pago', icon: Clock },
    { value: 'paid', label: 'Pagado', icon: CheckCircle },
    { value: 'processing', label: 'Procesando', icon: Clock },
    { value: 'shipped', label: 'Enviado', icon: Truck },
    { value: 'delivered', label: 'Entregado', icon: CheckCircle },
    { value: 'cancelled', label: 'Cancelado', icon: XCircle },
    { value: 'refunded', label: 'Reembolsado', icon: XCircle },
];

export default function RowActions({ order }: RowActionsProps) {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const router = useRouter();
    const supa = supabaseBrowser();

    const handleStatusChange = async (newStatus: string) => {
        if (isUpdating) return;
        setIsUpdating(true);

        try {
            const { error } = await supa
                .from('orders')
                .update({ status: newStatus })
                .eq('id', order.id);

            if (error) throw error;

            toast.success(`Estatus actualizado a: ${newStatus}`);
            router.refresh();
        } catch (error: any) {
            console.error('Error updating status:', error);
            toast.error('Error al actualizar estatus');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setIsDetailsOpen(true)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalles
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />

                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Truck className="mr-2 h-4 w-4" />
                            Cambiar Estatus
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            <DropdownMenuRadioGroup value={order.status} onValueChange={handleStatusChange}>
                                {ORDER_STATUSES.map((status) => (
                                    <DropdownMenuRadioItem key={status.value} value={status.value}>
                                        {status.label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                </DropdownMenuContent>
            </DropdownMenu>

            <OrderDetailsSheet
                order={order}
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
            />
        </>
    );
}
