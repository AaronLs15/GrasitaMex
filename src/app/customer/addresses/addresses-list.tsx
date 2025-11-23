"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, MapPin, Trash2, Pencil } from "lucide-react";
import CustomerAddressForm, { AddressData } from "./customer-address-form";
import { supabaseBrowser } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface AddressesListProps {
    userId: string;
    addresses: AddressData[];
}

export default function AddressesList({ userId, addresses }: AddressesListProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<AddressData | undefined>(undefined);
    const router = useRouter();
    const supa = supabaseBrowser();

    const handleDelete = async (id: number) => {
        if (!confirm("¿Estás seguro de eliminar esta dirección?")) return;

        try {
            const { error } = await supa.from("addresses").delete().eq("id", id);
            if (error) throw error;
            toast.success("Dirección eliminada");
            router.refresh();
        } catch (error) {
            console.error("Error deleting address:", error);
            toast.error("Error al eliminar la dirección");
        }
    };

    const openEdit = (address: AddressData) => {
        setEditingAddress(address);
        setIsDialogOpen(true);
    };

    const openNew = () => {
        setEditingAddress(undefined);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Mis Direcciones</h2>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openNew}>
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Dirección
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingAddress ? "Editar Dirección" : "Nueva Dirección"}
                            </DialogTitle>
                        </DialogHeader>
                        <CustomerAddressForm
                            userId={userId}
                            initialData={editingAddress}
                            onSuccess={() => setIsDialogOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {addresses.map((addr) => (
                    <Card key={addr.id} className="relative group">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-muted-foreground mt-1" />
                                <div className="flex-1 space-y-1 text-sm">
                                    <p className="font-medium">{addr.full_name}</p>
                                    <p>{addr.line1}</p>
                                    {addr.line2 && <p>{addr.line2}</p>}
                                    <p>
                                        {addr.city}, {addr.state} {addr.zip}
                                    </p>
                                    <p className="text-muted-foreground">Tel: {addr.phone}</p>
                                </div>
                            </div>

                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEdit(addr)}
                                >
                                    <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(addr.id!)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {addresses.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        No tienes direcciones guardadas.
                    </div>
                )}
            </div>
        </div>
    );
}
