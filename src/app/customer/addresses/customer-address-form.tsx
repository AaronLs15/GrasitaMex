"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export interface AddressData {
    id?: number;
    full_name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    reference?: string;
    country?: string;
}

interface CustomerAddressFormProps {
    userId: string;
    initialData?: AddressData;
    onSuccess: () => void;
}

export default function CustomerAddressForm({ userId, initialData, onSuccess }: CustomerAddressFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<AddressData>(initialData || {
        full_name: "",
        phone: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        zip: "",
        reference: "",
        country: "MX",
    });

    const router = useRouter();
    const supa = supabaseBrowser();

    const handleInputChange = (field: keyof AddressData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (initialData?.id) {
                // Update
                const { error } = await supa
                    .from("addresses")
                    .update({
                        ...formData,
                        country: formData.country || 'MX'
                    })
                    .eq("id", initialData.id);

                if (error) throw error;
                toast.success("Dirección actualizada");
            } else {
                // Create
                const { error } = await supa
                    .from("addresses")
                    .insert({
                        user_id: userId,
                        ...formData,
                        country: formData.country || 'MX'
                    });

                if (error) throw error;
                toast.success("Dirección agregada");
            }

            router.refresh();
            onSuccess();
        } catch (error: any) {
            console.error("Error saving address:", error);
            toast.error("Error al guardar la dirección");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="full_name">Nombre completo *</Label>
                <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange("full_name", e.target.value)}
                    placeholder="Juan Pérez"
                    required
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="5512345678"
                    required
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="line1">Calle y número *</Label>
                <Input
                    id="line1"
                    value={formData.line1}
                    onChange={(e) => handleInputChange("line1", e.target.value)}
                    placeholder="Av. Insurgentes Sur 1234"
                    required
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="line2">Colonia, apartamento (opcional)</Label>
                <Input
                    id="line2"
                    value={formData.line2 || ""}
                    onChange={(e) => handleInputChange("line2", e.target.value)}
                    placeholder="Col. Del Valle, Depto 5B"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="city">Ciudad *</Label>
                    <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange("city", e.target.value)}
                        placeholder="Ciudad de México"
                        required
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="state">Estado *</Label>
                    <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => handleInputChange("state", e.target.value)}
                        placeholder="CDMX"
                        required
                    />
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="zip">Código postal *</Label>
                <Input
                    id="zip"
                    value={formData.zip}
                    onChange={(e) => handleInputChange("zip", e.target.value)}
                    placeholder="01000"
                    required
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="reference">Referencia (opcional)</Label>
                <Input
                    id="reference"
                    value={formData.reference || ""}
                    onChange={(e) => handleInputChange("reference", e.target.value)}
                    placeholder="Entre calles X y Y"
                />
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? "Actualizar" : "Guardar"}
                </Button>
            </div>
        </form>
    );
}
