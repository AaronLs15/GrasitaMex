"use client";

import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const schema = z.object({
    name: z.string().min(2, "Requerido"),
    slug: z.string().min(2, "Requerido"),
    kind: z.enum(["general", "model"]),
});

type FormValues = z.infer<typeof schema>;

interface CategoryFormProps {
    initialData?: any;
}

export default function CategoryForm({ initialData }: CategoryFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(schema) as any,
        defaultValues: {
            name: initialData?.name ?? "",
            slug: initialData?.slug ?? "",
            kind: initialData?.kind ?? "general",
        },
    });

    async function onSubmit(values: FormValues) {
        setSaving(true);
        const supa = supabaseBrowser();

        try {
            const payload = {
                name: values.name,
                slug: values.slug,
                kind: values.kind,
            };

            if (initialData) {
                const { error } = await supa
                    .from("categories")
                    .update(payload)
                    .eq("id", initialData.id);
                if (error) throw error;
            } else {
                const { error } = await supa.from("categories").insert(payload);
                if (error) throw error;
            }

            toast({
                title: initialData ? "Categoría actualizada" : "Categoría creada",
            });
            router.push("/admin/categories");
            router.refresh();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    onChange={(e) => {
                                        field.onChange(e);
                                        if (!initialData && !form.formState.dirtyFields.slug) {
                                            form.setValue("slug", slugify(e.target.value), {
                                                shouldDirty: true,
                                            });
                                        }
                                    }}
                                    placeholder="Ej. Sneakers"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Slug</FormLabel>
                            <FormControl>
                                <Input {...field} placeholder="sneakers" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="kind"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="model">Modelo</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex gap-4 pt-4">
                    <Button type="submit" disabled={saving}>
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {initialData ? "Guardar Cambios" : "Crear Categoría"}
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
