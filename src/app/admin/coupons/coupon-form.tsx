"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabaseBrowser } from "@/lib/supabase/client";
import { toast } from "sonner";

const schema = z.object({
    code: z
        .string()
        .min(3, "El código debe tener al menos 3 caracteres")
        .regex(/^[A-Z0-9_-]+$/, "Solo mayúsculas, números, guiones y guiones bajos"),
    discount_type: z.enum(["percentage", "fixed_amount"]),
    discount_value: z.coerce.number().min(1, "Debe ser mayor a 0"),
    min_purchase_cents: z.coerce.number().min(0).default(0),
    max_discount_cents: z.coerce.number().optional().nullable(),
    usage_limit: z.coerce.number().optional().nullable(),
    active: z.boolean().default(true),
    // Fechas opcionales
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface CouponFormProps {
    initialData?: any; // Tipo laxo para simplificar, idealmente tipado con la DB
}

export default function CouponForm({ initialData }: CouponFormProps) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(schema) as any,
        defaultValues: {
            code: initialData?.code ?? "",
            discount_type: initialData?.discount_type ?? "percentage",
            discount_value: initialData?.discount_value ?? 10,
            min_purchase_cents: initialData ? initialData.min_purchase_cents / 100 : 0,
            max_discount_cents: initialData?.max_discount_cents
                ? initialData.max_discount_cents / 100
                : null,
            usage_limit: initialData?.usage_limit ?? null,
            active: initialData?.active ?? true,
            start_date: initialData?.start_date
                ? new Date(initialData.start_date).toISOString().slice(0, 16)
                : "",
            end_date: initialData?.end_date
                ? new Date(initialData.end_date).toISOString().slice(0, 16)
                : "",
        },
    });

    const onSubmit = async (values: FormValues) => {
        setSaving(true);
        const supa = supabaseBrowser();

        const payload = {
            code: values.code,
            discount_type: values.discount_type,
            discount_value: values.discount_value,
            min_purchase_cents: Math.round(values.min_purchase_cents * 100),
            max_discount_cents: values.max_discount_cents
                ? Math.round(values.max_discount_cents * 100)
                : null,
            usage_limit: values.usage_limit || null,
            active: values.active,
            start_date: values.start_date ? new Date(values.start_date).toISOString() : null,
            end_date: values.end_date ? new Date(values.end_date).toISOString() : null,
        };

        let error;
        if (initialData) {
            const { error: err } = await supa
                .from("coupons")
                .update(payload)
                .eq("id", initialData.id);
            error = err;
        } else {
            const { error: err } = await supa.from("coupons").insert(payload);
            error = err;
        }

        setSaving(false);

        if (error) {
            console.error(error);
            toast.error("Error al guardar el cupón");
        } else {
            toast.success("Cupón guardado correctamente");
            router.push("/admin/coupons");
            router.refresh();
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Código</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        placeholder="EJEMPLO10"
                                        className="uppercase"
                                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Único, mayúsculas y sin espacios.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="active"
                        render={({ field }) => (
                            <FormItem className="flex flex-col gap-2">
                                <FormLabel>Estatus</FormLabel>
                                <div className="flex items-center gap-2 h-10">
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        {field.value ? "Activo" : "Inactivo"}
                                    </span>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="discount_type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tipo de descuento</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                                        <SelectItem value="fixed_amount">Monto Fijo ($)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="discount_value"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Valor</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormDescription>
                                    Porcentaje (0-100) o monto en pesos.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="min_purchase_cents"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Compra mínima ($)</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="max_discount_cents"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tope de descuento ($)</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        {...field}
                                        value={field.value ?? ""}
                                        placeholder="Opcional"
                                    />
                                </FormControl>
                                <FormDescription>
                                    Solo aplica para porcentaje.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormField
                        control={form.control}
                        name="usage_limit"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Límite de usos</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        {...field}
                                        value={field.value ?? ""}
                                        placeholder="Ilimitado"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="start_date"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fecha inicio</FormLabel>
                                <FormControl>
                                    <Input
                                        type="datetime-local"
                                        {...field}
                                        value={field.value ?? ""}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="end_date"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fecha fin</FormLabel>
                                <FormControl>
                                    <Input
                                        type="datetime-local"
                                        {...field}
                                        value={field.value ?? ""}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex gap-4 pt-4">
                    <Button type="submit" disabled={saving}>
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Guardar Cupón
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                    >
                        Cancelar
                    </Button>
                </div>
            </form>
        </Form>
    );
}
