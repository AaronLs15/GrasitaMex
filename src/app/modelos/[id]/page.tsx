"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import { AddToCartControl, type SizeOption } from "@/components/cart/AddToCartControl";
import HeadNavBar from "@/components/HeadNavBar";
import { ChevronRight } from "lucide-react";

/* ---------- types ---------- */
type ProductDetail = {
    id: number;
    title: string;
    description: string | null;
    price_cents: number;
    condition: "new" | "used" | string;
    images: { url: string; position: number }[];
    category: string | null;
    sizeOptions: SizeOption[];
};

type RelatedProduct = {
    id: number;
    title: string;
    price_cents: number;
    image_url: string | null;
    condition: "new" | "used" | string;
};

/* ---------- helpers ---------- */
function moneyFromCents(cents: number) {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
    }).format((cents ?? 0) / 100);
}

export default function ProductDetailPage() {
    const params = useParams();
    const id = params.id as string;

    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [related, setRelated] = useState<RelatedProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Selected size for AddToCart
    // Note: AddToCartControl handles its own state, but we might need to lift it if we want a custom UI
    // For now, we'll use AddToCartControl which encapsulates the size selection logic.
    // However, the requirement says "necesario que seleccione talla", which AddToCartControl does.

    useEffect(() => {
        if (!id) return;

        (async () => {
            setLoading(true);
            setErrorMsg(null);

            // 1. Fetch product details
            const { data: prodData, error: prodError } = await supabase
                .from("products")
                .select(`
          id, title, description, price_cents, condition,
          product_images (url, position),
          product_categories (
            category:categories (id, name, kind)
          ),
          product_variants (size_label, qty, active)
        `)
                .eq("id", id)
                .single();

            if (prodError || !prodData) {
                console.error("Error fetching product:", prodError);
                setErrorMsg("No pudimos cargar el producto. Puede que no exista.");
                setLoading(false);
                return;
            }

            // Process images
            const images = (prodData.product_images ?? []) as { url: string; position: number }[];
            images.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

            // Process variants -> sizeOptions
            const variants = (prodData.product_variants ?? []) as {
                size_label: string | null;
                qty?: number | null;
                active?: boolean | null;
            }[];

            const sizeMap = new Map<string, number>();
            for (const v of variants) {
                const label = v.size_label?.trim();
                if (!label) continue;
                if (v.active === false) continue;
                const qty = v.qty ?? 0;
                if (qty <= 0) continue;
                sizeMap.set(label, (sizeMap.get(label) ?? 0) + qty);
            }

            // Sort sizes numerically if possible, otherwise alphabetically
            const sortedLabels = Array.from(sizeMap.keys()).sort((a, b) => {
                const numA = parseFloat(a.match(/(\d+(\.\d+)?)/)?.[0] ?? "0");
                const numB = parseFloat(b.match(/(\d+(\.\d+)?)/)?.[0] ?? "0");
                if (numA > 0 && numB > 0) return numA - numB;
                return a.localeCompare(b);
            });

            const sizeOptions = sortedLabels.map(label => ({
                label,
                available: sizeMap.get(label) ?? 0
            }));

            // Process category (take the first 'general' one)
            const pcats = (prodData.product_categories ?? []) as unknown as { category?: { id: number; name: string; kind: string } }[];
            const generalCat = pcats.find(pc => pc.category?.kind === "general")?.category;
            const categoryName = generalCat?.name ?? null;
            const categoryId = generalCat?.id;

            setProduct({
                id: prodData.id,
                title: prodData.title,
                description: prodData.description,
                price_cents: prodData.price_cents,
                condition: prodData.condition,
                images,
                category: categoryName,
                sizeOptions,
            });

            // 2. Fetch related products (same category, excluding current)
            if (categoryId) {
                const { data: relData, error: relError } = await supabase
                    .from("product_categories")
                    .select(`
            product:products (
              id, title, price_cents, condition, published,
              product_images (url, position)
            )
          `)
                    .eq("category_id", categoryId)
                    .neq("product_id", id) // exclude current
                    .limit(4);

                if (!relError && relData) {
                    const mappedRelated = relData
                        .map((item: any) => {
                            const p = item.product;
                            if (!p || !p.published) return null;

                            const pImgs = (p.product_images ?? []) as { url: string; position: number }[];
                            pImgs.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

                            return {
                                id: p.id,
                                title: p.title,
                                price_cents: p.price_cents,
                                condition: p.condition,
                                image_url: pImgs[0]?.url ?? null,
                            } as RelatedProduct;
                        })
                        .filter((p): p is RelatedProduct => p !== null);

                    setRelated(mappedRelated);
                }
            }

            setLoading(false);
        })();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <HeadNavBar />
                <div className="flex items-center justify-center h-[60vh]">
                    <p className="text-muted-foreground animate-pulse">Cargando producto...</p>
                </div>
            </div>
        );
    }

    if (errorMsg || !product) {
        return (
            <div className="min-h-screen bg-background">
                <HeadNavBar />
                <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                    <p className="text-red-500">{errorMsg ?? "Producto no encontrado"}</p>
                    <Button asChild>
                        <Link href="/modelos">Volver a modelos</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <HeadNavBar />

            <main className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
                {/* Breadcrumb-ish */}
                <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
                    <Link href="/modelos" className="hover:text-foreground transition-colors">
                        Modelos
                    </Link>
                    <ChevronRight className="w-4 h-4" />
                    <span className="font-medium text-foreground truncate max-w-[200px]">
                        {product.title}
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
                    {/* Left: Image Gallery */}
                    <div className="space-y-4">
                        <div className="relative overflow-hidden rounded-3xl bg-muted aspect-square border border-border/50">
                            {product.images.length > 0 ? (
                                <Carousel className="w-full h-full">
                                    <CarouselContent>
                                        {product.images.map((img, idx) => (
                                            <CarouselItem key={idx}>
                                                <div className="relative w-full h-full aspect-square">
                                                    <Image
                                                        src={img.url}
                                                        alt={`${product.title} - vista ${idx + 1}`}
                                                        fill
                                                        className="object-cover"
                                                        priority={idx === 0}
                                                    />
                                                </div>
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    {product.images.length > 1 && (
                                        <>
                                            <CarouselPrevious className="left-4" />
                                            <CarouselNext className="right-4" />
                                        </>
                                    )}
                                </Carousel>
                            ) : (
                                <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                                    Sin imágenes
                                </div>
                            )}
                        </div>
                        {/* Thumbnails (optional, simple grid) */}
                        {product.images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {product.images.map((img, idx) => (
                                    <div key={idx} className="relative w-20 h-20 shrink-0 overflow-hidden rounded-lg border border-border/50 cursor-pointer hover:border-primary/50">
                                        <Image
                                            src={img.url}
                                            alt={`Thumbnail ${idx}`}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Product Info */}
                    <div className="flex flex-col gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Badge variant={product.condition === 'new' ? 'default' : 'secondary'}>
                                    {product.condition === 'new' ? 'Nuevo' : 'Usado'}
                                </Badge>
                                {product.category && (
                                    <span className="text-sm text-muted-foreground font-medium">
                                        {product.category}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                                {product.title}
                            </h1>
                            <p className="mt-2 text-2xl font-semibold text-primary">
                                {moneyFromCents(product.price_cents)}
                            </p>
                        </div>

                        <div className="prose prose-sm text-muted-foreground">
                            <p>{product.description || "Sin descripción disponible."}</p>
                        </div>

                        <div className="p-6 border rounded-2xl bg-card/50 backdrop-blur-sm">
                            <h3 className="mb-4 text-sm font-medium">Selecciona tu talla</h3>
                            <AddToCartControl
                                productId={product.id}
                                title={product.title}
                                priceCents={product.price_cents}
                                sizeOptions={product.sizeOptions}
                                className="w-full"
                                buttonVariant="default"
                                buttonSize="lg"
                            />
                            <p className="mt-3 text-xs text-center text-muted-foreground">
                                Envío calculado en el checkout.
                            </p>
                        </div>

                        {/* Additional Info / Trust Badges */}
                        <div className="grid grid-cols-2 gap-4 pt-6 border-t">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium">Envío Seguro</span>
                                <span className="text-xs text-muted-foreground">A todo México por estafeta/fedex</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium">Autenticidad</span>
                                <span className="text-xs text-muted-foreground">Productos 100% verificados</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Related Products */}
                {related.length > 0 && (
                    <section className="mt-24">
                        <h2 className="text-2xl font-bold tracking-tight mb-6">También te podría interesar</h2>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            {related.map((p) => (
                                <Link key={p.id} href={`/modelos/${p.id}`} className="group">
                                    <div className="overflow-hidden border rounded-2xl bg-card transition-all hover:shadow-md hover:border-primary/30">
                                        <div className="relative aspect-square bg-muted">
                                            <Image
                                                src={p.image_url ?? "/logoGrasitaMex.ico"}
                                                alt={p.title}
                                                fill
                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                            <div className="absolute top-2 left-2">
                                                <Badge variant={p.condition === 'new' ? 'default' : 'secondary'} className="text-[10px] px-2 h-5">
                                                    {p.condition === 'new' ? 'Nuevo' : 'Usado'}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h3 className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                                                {p.title}
                                            </h3>
                                            <p className="text-sm font-semibold mt-1">
                                                {moneyFromCents(p.price_cents)}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
