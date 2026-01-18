"use client";

import { useState, useMemo } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Loader2, X } from "lucide-react";

// Types
type Category = {
    id: number;
    name: string;
    slug: string;
    kind: "general" | "model";
};

type ProductImage = {
    id?: number;
    url: string;
    position: number;
};

// Schema
const schema = z.object({
    title: z.string().min(2, "Requerido"),
    slug: z.string().min(2, "Requerido"),
    description: z.string().optional().nullable(),
    brand: z.string().optional().nullable(),
    model_name: z.string().optional().nullable(),
    condition: z.enum(["new", "used"]),
    currency: z.string().length(3, "3 letras, p. ej. MXN"),
    price_value: z.coerce.number().min(0, ">= 0"),
    initial_price_value: z.coerce.number().min(0, ">= 0"),
    published: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ProductFormProps {
    initialData?: any; // Product data from DB
    categories: Category[];
    initialCategories?: number[]; // IDs of selected categories
    initialImages?: ProductImage[];
}

export default function ProductForm({
    initialData,
    categories,
    initialCategories = [],
    initialImages = [],
}: ProductFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

    // Categories state
    const [selectedGeneral, setSelectedGeneral] = useState<number[]>(
        initialCategories.filter((id) =>
            categories.find((c) => c.id === id && c.kind === "general")
        )
    );
    const [selectedModels, setSelectedModels] = useState<number[]>(
        initialCategories.filter((id) =>
            categories.find((c) => c.id === id && c.kind === "model")
        )
    );

    // Images state
    const [files, setFiles] = useState<FileList | null>(null);
    const [previews, setPreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<ProductImage[]>(initialImages);

    const catsGeneral = useMemo(
        () => categories.filter((c) => c.kind === "general"),
        [categories]
    );
    const catsModel = useMemo(
        () => categories.filter((c) => c.kind === "model"),
        [categories]
    );

    const form = useForm<FormValues>({
        resolver: zodResolver(schema) as any,
        defaultValues: {
            title: initialData?.title ?? "",
            slug: initialData?.slug ?? "",
            description: initialData?.description ?? "",
            brand: initialData?.brand ?? "",
            model_name: initialData?.model_name ?? "",
            condition: initialData?.condition ?? "new",
            currency: initialData?.currency ?? "MXN",
            price_value: initialData ? initialData.price_cents / 100 : 0,
            initial_price_value: initialData ? initialData.initialprice_cents / 100 : 0,
            published: initialData?.published ?? false,
        },
    });

    function handleFiles(fl: FileList | null) {
        setFiles(fl);
        if (fl && fl.length) {
            const arr = Array.from(fl).slice(0, 12);
            const urls = arr.map((f) => URL.createObjectURL(f));
            setPreviews(urls);
        } else {
            setPreviews([]);
        }
    }

    async function handleDeleteImage(imageId: number) {
        if (!confirm("¿Eliminar imagen?")) return;
        const supa = supabaseBrowser();
        const { error } = await supa.from("product_images").delete().eq("id", imageId);
        if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
            setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
            toast({ title: "Imagen eliminada" });
        }
    }

    async function onSubmit(values: FormValues) {
        setSaving(true);
        const supa = supabaseBrowser();

        try {
            const price_cents = Math.round(values.price_value * 100);
            const initialprice_cents = Math.round(values.initial_price_value * 100);
            const payload = {
                title: values.title,
                slug: values.slug,
                description: values.description || null,
                brand: values.brand || null,
                model_name: values.model_name || null,
                condition: values.condition,
                currency: values.currency.toUpperCase(),
                price_cents,
                initialprice_cents,
                published: !!values.published,
            };

            let productId = initialData?.id;

            if (initialData) {
                // Update
                const { error } = await supa
                    .from("products")
                    .update(payload)
                    .eq("id", productId);
                if (error) throw error;
            } else {
                // Create
                const { data: created, error } = await supa
                    .from("products")
                    .insert(payload)
                    .select("id")
                    .single();
                if (error) throw error;
                productId = created.id;
            }

            // Update Categories
            const targetIds = new Set([...selectedGeneral, ...selectedModels]);

            // If editing, calculate diff
            if (initialData) {
                const currentIds = new Set(initialCategories);
                const toAdd: number[] = [];
                const toRemove: number[] = [];

                for (const id of targetIds) if (!currentIds.has(id)) toAdd.push(id);
                for (const id of currentIds) if (!targetIds.has(id)) toRemove.push(id);

                if (toAdd.length > 0) {
                    const rows = toAdd.map((cid) => ({
                        product_id: productId,
                        category_id: cid,
                    }));
                    await supa.from("product_categories").insert(rows);
                }
                if (toRemove.length > 0) {
                    await supa
                        .from("product_categories")
                        .delete()
                        .in("category_id", toRemove)
                        .eq("product_id", productId);
                }
            } else {
                // New product, just insert all
                if (targetIds.size > 0) {
                    const rows = Array.from(targetIds).map((cid) => ({
                        product_id: productId,
                        category_id: cid,
                    }));
                    await supa.from("product_categories").insert(rows);
                }
            }

            // Upload Images
            if (files && files.length > 0) {
                // Get current max position
                const maxPos = existingImages.reduce((max, img) => Math.max(max, img.position), -1);
                let position = maxPos + 1;

                for (const file of Array.from(files)) {
                    const ext = file.name.split(".").pop();
                    const name = crypto.randomUUID() + (ext ? `.${ext}` : "");
                    const path = `${productId}/${name}`;

                    const { error: upErr } = await supa.storage
                        .from("product-images")
                        .upload(path, file, { upsert: false });
                    if (upErr) throw upErr;

                    const { data: pub } = supa.storage
                        .from("product-images")
                        .getPublicUrl(path);

                    await supa.from("product_images").insert({
                        product_id: productId,
                        url: pub.publicUrl,
                        position,
                    });
                    position++;
                }
            }

            toast({
                title: initialData ? "Producto actualizado" : "Producto creado",
            });
            router.push("/admin/products");
            router.refresh();
        } catch (e: any) {
            console.error(e);
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Left Column: Basic Info */}
                    <div className="space-y-6">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Título</FormLabel>
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
                                            placeholder="Ej. Jordan 1 High Chicago"
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
                                        <Input {...field} placeholder="jordan-1-high-chicago" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="brand"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Marca</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value ?? ""} placeholder="Nike" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="model_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Modelo</FormLabel>
                                        <FormControl>
                                            <Input {...field} value={field.value ?? ""} placeholder="Jordan 1" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="condition"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Condición</FormLabel>
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
                                                <SelectItem value="new">Nuevo</SelectItem>
                                                <SelectItem value="used">Usado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="price_value"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Precio</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" min="0" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="initial_price_value"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Precio de compra</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" min="0" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            rows={4}
                                            {...field}
                                            value={field.value ?? ""}
                                            placeholder="Detalles del producto..."
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="published"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="space-y-0.5">
                                        <FormLabel>Publicado</FormLabel>
                                        <p className="text-sm text-muted-foreground">
                                            Visible en la tienda
                                        </p>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={!!field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Right Column: Categories & Images */}
                    <div className="space-y-6">
                        <div className="p-4 border rounded-lg">
                            <h3 className="mb-4 font-medium">Categorías</h3>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div>
                                    <Label className="block mb-2 text-xs uppercase text-muted-foreground">Generales</Label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {catsGeneral.map((c) => (
                                            <label key={c.id} className="flex items-center gap-2 text-sm">
                                                <Checkbox
                                                    checked={selectedGeneral.includes(c.id)}
                                                    onCheckedChange={(v) => {
                                                        setSelectedGeneral((prev) =>
                                                            v
                                                                ? [...prev, c.id]
                                                                : prev.filter((id) => id !== c.id)
                                                        );
                                                    }}
                                                />
                                                <span>{c.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <Label className="block mb-2 text-xs uppercase text-muted-foreground">Modelos</Label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {catsModel.map((c) => (
                                            <label key={c.id} className="flex items-center gap-2 text-sm">
                                                <Checkbox
                                                    checked={selectedModels.includes(c.id)}
                                                    onCheckedChange={(v) => {
                                                        setSelectedModels((prev) =>
                                                            v
                                                                ? [...prev, c.id]
                                                                : prev.filter((id) => id !== c.id)
                                                        );
                                                    }}
                                                />
                                                <span>{c.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label>Imágenes</Label>

                            {/* Existing Images */}
                            {existingImages.length > 0 && (
                                <div className="grid grid-cols-3 gap-4 mb-4 sm:grid-cols-4">
                                    {existingImages.map((img) => (
                                        <div key={img.id} className="relative overflow-hidden border rounded-lg aspect-square group">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={img.url}
                                                alt=""
                                                className="object-cover w-full h-full"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => img.id && handleDeleteImage(img.id)}
                                                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* New Uploads */}
                            <div className="flex items-center gap-3">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => handleFiles(e.target.files)}
                                />
                            </div>

                            {previews.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 mt-4 sm:grid-cols-4">
                                    {previews.map((src, i) => (
                                        <div
                                            key={i}
                                            className="overflow-hidden border rounded-md aspect-square bg-muted"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={src}
                                                alt=""
                                                className="object-cover w-full h-full"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-4 border-t">
                    <Button type="submit" disabled={saving}>
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {initialData ? "Guardar Cambios" : "Crear Producto"}
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
