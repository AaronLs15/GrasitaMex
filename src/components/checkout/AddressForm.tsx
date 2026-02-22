// components/checkout/AddressForm.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Plus } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

export interface Address {
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

interface AddressFormProps {
    userId?: string | null;
    onAddressChange: (address: Address | null) => void;
}

export function AddressForm({ userId, onAddressChange }: AddressFormProps) {
    const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string>("new");
    const [saveAddress, setSaveAddress] = useState(false);
    const [formData, setFormData] = useState<Address>({
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

    // Cargar direcciones guardadas
    useEffect(() => {
        const loadAddresses = async () => {
            const supa = supabaseBrowser();
            const { data } = await supa
                .from("addresses")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });

            if (data && data.length > 0) {
                setSavedAddresses(data);
            }
        };

        if (userId) {
            loadAddresses();
        }
    }, [userId]);

    // Notificar cambios al padre
    useEffect(() => {
        if (selectedAddressId === "new") {
            // Usuario está usando nueva dirección
            // Validar que los campos requeridos estén llenos
            const isValid =
                formData.full_name &&
                formData.phone &&
                formData.line1 &&
                formData.city &&
                formData.state &&
                formData.zip;

            // NO incluir id en nuevas direcciones
            const addressWithoutId = { ...formData };
            delete addressWithoutId.id;
            onAddressChange(isValid ? addressWithoutId : null);
        } else {
            // Usuario seleccionó dirección guardada
            // Incluir el id para que el API sepa que es una dirección existente
            const selected = savedAddresses.find(
                (addr) => addr.id?.toString() === selectedAddressId
            );
            onAddressChange(selected || null);
        }
    }, [selectedAddressId, formData, savedAddresses, onAddressChange]);

    const handleSelectChange = (value: string) => {
        setSelectedAddressId(value);

        if (value !== "new") {
            const selected = savedAddresses.find(
                (addr) => addr.id?.toString() === value
            );
            if (selected) {
                setFormData(selected);
            }
        }
    };

    const handleInputChange = (field: keyof Address, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <Card className="rounded-2xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Dirección de Envío
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Select de direcciones guardadas */}
                {savedAddresses.length > 0 && (
                    <div className="space-y-2">
                        <Label>Selecciona una dirección</Label>
                        <Select value={selectedAddressId} onValueChange={handleSelectChange}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">
                                    <div className="flex items-center gap-2">
                                        <Plus className="w-4 h-4" />
                                        Usar nueva dirección
                                    </div>
                                </SelectItem>
                                {savedAddresses.map((addr) => (
                                    <SelectItem key={addr.id} value={addr.id!.toString()}>
                                        {addr.full_name} - {addr.line1}, {addr.city}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Formulario */}
                <div className="grid gap-4">
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
                            placeholder="Entre calles X y Y, edificio azul"
                        />
                    </div>
                </div>

                {/* Checkbox para guardar dirección */}
                {selectedAddressId === "new" && Boolean(userId) && (
                    <div className="flex items-center gap-2 pt-2">
                        <Checkbox
                            id="save-address"
                            checked={saveAddress}
                            onCheckedChange={(checked) => setSaveAddress(checked as boolean)}
                        />
                        <Label
                            htmlFor="save-address"
                            className="text-sm font-normal cursor-pointer"
                        >
                            Guardar esta dirección para futuros pedidos
                        </Label>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Hook personalizado para obtener el estado "guardar dirección"
export function useAddressFormState() {
    const [shouldSaveAddress, setShouldSaveAddress] = useState(false);
    return { shouldSaveAddress, setShouldSaveAddress };
}
