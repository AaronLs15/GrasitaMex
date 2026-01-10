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
import { notifyOrderStatus } from "@/app/actions/email-actions";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    const [shippingDialogOpen, setShippingDialogOpen] = useState(false);
    const [shippingSender, setShippingSender] = useState<'Estafeta' | 'DHL' | 'Fedex'>('Estafeta');
    const [shippingTracking, setShippingTracking] = useState('');
    const [pendingStatus, setPendingStatus] = useState<string | null>(null);
    const [shippingError, setShippingError] = useState<string | null>(null);
    const router = useRouter();
    const supa = supabaseBrowser();

    const openShippingDialog = (nextStatus: string) => {
        setPendingStatus(nextStatus);
        setShippingSender('Estafeta');
        setShippingTracking('');
        setShippingError(null);
        setShippingDialogOpen(true);
    };

    const handleStatusChange = async (newStatus: string) => {
        if (isUpdating) return;
        if (newStatus === 'shipped' && order.delivery_method === 'shipment') {
            openShippingDialog(newStatus);
            return;
        }

        setIsUpdating(true);

        try {
            const { error } = await supa
                .from('orders')
                .update({ status: newStatus })
                .eq('id', order.id);

            if (error) throw error;

            toast.success(`Estatus actualizado a: ${newStatus}`);
            if (['processing', 'shipped', 'delivered', 'cancelled'].includes(newStatus)) {
                notifyOrderStatus(order.id, newStatus).then((res) => {
                    if (!res.success) console.error('Error sending status email:', res.error);
                });
            }
            router.refresh();
        } catch (error: any) {
            console.error('Error updating status:', error);
            toast.error('Error al actualizar estatus');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleShippingSubmit = async () => {
        if (!pendingStatus) return;
        if (!shippingTracking.trim()) {
            setShippingError('Ingresa el tracking ID.');
            return;
        }
        setShippingError(null);

        setIsUpdating(true);
        setShippingDialogOpen(false);

        try {
            const { error } = await supa
                .from('orders')
                .update({ status: pendingStatus })
                .eq('id', order.id);

            if (error) throw error;

            toast.success(`Estatus actualizado a: ${pendingStatus}`);
            notifyOrderStatus(order.id, pendingStatus, {
                trackingNumber: shippingTracking.trim(),
                sender: shippingSender,
            }).then((res) => {
                if (!res.success) console.error('Error sending status email:', res.error);
            });
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
            <Dialog open={shippingDialogOpen} onOpenChange={setShippingDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Datos de envio</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Paqueteria</Label>
                            <Select value={shippingSender} onValueChange={(value) => setShippingSender(value as any)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Estafeta">Estafeta</SelectItem>
                                    <SelectItem value="DHL">DHL</SelectItem>
                                    <SelectItem value="Fedex">Fedex</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tracking ID</Label>
                            <Input
                                value={shippingTracking}
                                onChange={(e) => setShippingTracking(e.target.value)}
                                placeholder="Ingresa el tracking"
                            />
                            {shippingError && (
                                <p className="text-xs text-destructive">{shippingError}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShippingDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleShippingSubmit} disabled={isUpdating}>
                            Guardar y enviar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
