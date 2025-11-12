"use client";

import { useTransition, useState, useMemo } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Upload } from "lucide-react";

type Product = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  brand: string | null;
  model_name: string | null;
  condition: "new" | "used";
  currency: string;
  price_cents: number;
  published: boolean;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  kind: "general" | "model";
};

const schema = z.object({
  title: z.string().min(2, "Requerido"),
  slug: z.string().min(2, "Requerido"),
  description: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  model_name: z.string().optional().nullable(),
  condition: z.enum(["new", "used"]),
  currency: z.string().length(3, "3 letras, p. ej. MXN"),
  price_value: z.coerce.number().min(0, ">= 0"),
  published: z.boolean().optional(),
  images: z.any().optional(),
});

export default function ProductsClient({
  initial,
  categories,
}: {
  initial: Product[];
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [files, setFiles] = useState<FileList | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedGeneral, setSelectedGeneral] = useState<number[]>([]);
  const [selectedModels, setSelectedModels] = useState<number[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  const catsGeneral = useMemo(
    () => categories.filter((c) => c.kind === "general"),
    [categories]
  );
  const catsModel = useMemo(
    () => categories.filter((c) => c.kind === "model"),
    [categories]
  );

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      brand: "",
      model_name: "",
      condition: "new",
      currency: "MXN",
      price_value: 0,
      published: false,
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

  async function onSubmit(values: z.infer<typeof schema>) {
    const supa = supabaseBrowser();

    // validación simple imágenes
    if (files && files.length > 0) {
      for (const f of Array.from(files)) {
        if (!/^image\/(png|jpe?g|webp|gif|avif)$/i.test(f.type)) {
          toast({
            title: "Formato no soportado",
            description: f.name,
            variant: "destructive",
          });
          return;
        }
        if (f.size > 8 * 1024 * 1024) {
          toast({
            title: "Archivo muy grande",
            description: `${f.name} (>8MB)`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    try {
      const price_cents = Math.round(values.price_value * 100);
      const payload = {
        title: values.title,
        slug: values.slug,
        description: values.description || null,
        brand: values.brand || null,
        model_name: values.model_name || null,
        condition: values.condition,
        currency: values.currency.toUpperCase(),
        price_cents,
        published: !!values.published,
      };

      // 1) crea producto
      const { data: created, error: insErr } = await supa
        .from("products")
        .insert(payload)
        .select("id")
        .single();
      if (insErr) throw insErr;
      const productId = created.id as number;

      // 2) relaciona categorías (si hay)
      const catIds = [...selectedGeneral, ...selectedModels];
      if (catIds.length > 0) {
        const rows = catIds.map((cid) => ({
          product_id: productId,
          category_id: cid,
        }));
        const { error: pcErr } = await supa
          .from("product_categories")
          .insert(rows);
        if (pcErr) throw pcErr;
      }

      // 3) sube imágenes (si hay)
      if (files && files.length > 0) {
        let position = 0;
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
          position += 1;
          const { error: imgErr } = await supa.from("product_images").insert({
            product_id: productId,
            url: pub.publicUrl,
            position,
          });
          if (imgErr) throw imgErr;
        }
      }

      toast({
        title: "Producto creado",
        description: `${catIds.length} categoría(s) asignadas${
          files?.length ? " e imágenes subidas" : ""
        }.`,
      });
      setOpen(false);
      startTransition(() => router.refresh());
      form.reset();
      handleFiles(null);
      setSelectedGeneral([]);
      setSelectedModels([]);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Nuevo producto
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            handleFiles(null);
            setSelectedGeneral([]);
            setSelectedModels([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo producto</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Datos principales */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                            if (!form.formState.dirtyFields.slug) {
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
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Nike, New Balance, etc."
                        />
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
                        <Input {...field} placeholder="Jordan 1 High" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condición</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">new</SelectItem>
                            <SelectItem value="used">used</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Moneda</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="MXN" maxLength={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Precio ({form.watch("currency").toUpperCase()})
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          placeholder="1999.99"
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
                    <FormItem className="flex items-center justify-between space-y-0">
                      <FormLabel>Publicado</FormLabel>
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

              {/* Descripción */}
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
                        placeholder="Detalles, colorway, etc."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Categorías */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <Label className="block mb-2">Categorías (general)</Label>
                  <div className="pr-1 space-y-2 overflow-auto max-h-48">
                    {catsGeneral.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 text-sm"
                      >
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
                    {catsGeneral.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No hay categorías generales.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="block mb-2">Categorías (model)</Label>
                  <div className="pr-1 space-y-2 overflow-auto max-h-48">
                    {catsModel.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 text-sm"
                      >
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
                    {catsModel.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No hay categorías de modelo.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Imágenes */}
              <div className="space-y-2">
                <Label>Imágenes del producto (opcional)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  <Button type="button" variant="outline" disabled>
                    <Upload className="w-4 h-4 mr-2" />
                    Se subirán al guardar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Se guardarán en <code>product-images/&lt;productId&gt;/</code>
                  . Máx 8&nbsp;MB por archivo.
                </p>
                {previews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
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

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    handleFiles(null);
                    setSelectedGeneral([]);
                    setSelectedModels([]);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  Crear producto
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
