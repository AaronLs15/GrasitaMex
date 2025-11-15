"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import HeadNavBar from "@/components/HeadNavBar";
import { supabase } from "@/lib/supabase/client";
import {
  AddToCartControl,
  type SizeOption as CartSizeOption,
} from "@/components/cart/AddToCartControl";

/* ---------- tipos ---------- */

type Product = {
  id: number;
  title: string;
  price_cents: number;
  condition: "new" | "used" | string;
  created_at: string;
  image_url: string | null; // derivada de product_images
  category: string | null; // categoría general principal
  sizeCm: number | null; // talla principal en cm (parseada de size_label)
  sizeOptions: CartSizeOption[]; // tallas disponibles con stock
};

/* ---------- helpers ---------- */

function moneyFromCents(cents: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format((cents ?? 0) / 100);
}

export default function ModelosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<number[]>([]);
  const [searchText, setSearchText] = useState("");

  /* ---------- fetch a Supabase ---------- */

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("products")
        .select(
          `
          id,
          title,
          price_cents,
          condition,
          created_at,
          product_images (
            url,
            position
          ),
          product_categories (
            category:categories (
              name,
              kind
            )
          ),
          product_variants (
            size_label,
            qty,
            active
          )
        `
        )
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error al cargar productos:", error);
        setErrorMsg("Ocurrió un error al cargar los productos.");
        setProducts([]);
        setLoading(false);
        return;
      }

      const mapped: Product[] =
        (data ?? []).map((row: any) => {
          // Imagen principal (menor position)
          const imgs = (row.product_images ?? []) as {
            url: string;
            position: number | null;
          }[];

          imgs.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          const firstImg = imgs[0]?.url ?? null;

          // Categoría general principal
          const pcats = (row.product_categories ?? []) as {
            category?: { name?: string; kind?: string };
          }[];

          const generalCats = pcats
            .map((pc) => pc.category)
            .filter(
              (c): c is { name: string; kind?: string } =>
                !!c && (!c.kind || c.kind === "general")
            );

          const firstCatName = generalCats[0]?.name ?? null;

          // Variantes: usamos la cantidad disponible por talla
          const variants = (row.product_variants ?? []) as {
            size_label: string | null;
            qty?: number | null;
            active?: boolean | null;
          }[];

          const sizeMap = new Map<string, number>();
          for (const variant of variants) {
            const label = variant.size_label?.trim();
            if (!label) continue;
            if (variant.active === false) continue;
            const qty = variant.qty ?? 0;
            if (qty <= 0) continue;
            sizeMap.set(label, (sizeMap.get(label) ?? 0) + qty);
          }

          const labelPool =
            sizeMap.size > 0
              ? Array.from(sizeMap.keys())
              : variants
                  .map((v) => v.size_label?.trim())
                  .filter((label): label is string => Boolean(label));

          let sizeCm: number | null = null;
          for (const label of labelPool) {
            const match = label.match(/(\d+(\.\d+)?)/);
            if (match) {
              sizeCm = parseFloat(match[1]);
              break;
            }
          }

          const sizeOptions = Array.from(sizeMap.entries()).map(
            ([label, available]) => ({ label, available })
          );

          return {
            id: row.id,
            title: row.title,
            price_cents: row.price_cents,
            condition: row.condition,
            created_at: row.created_at,
            image_url: firstImg,
            category: firstCatName,
            sizeCm,
            sizeOptions,
          };
        }) ?? [];

      setProducts(mapped);
      setLoading(false);
    })();
  }, []);

  /* ---------- opciones de filtros dinámicas ---------- */

  const allCategories = useMemo(
    () =>
      Array.from(
        new Set(products.map((p) => p.category).filter((c): c is string => !!c))
      ).sort(),
    [products]
  );

  const allSizes = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((p) => p.sizeCm)
            .filter((s): s is number => typeof s === "number" && s > 0)
        )
      ).sort((a, b) => a - b),
    [products]
  );

  /* ---------- lógica de filtros ---------- */

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const toggleSize = (size: number) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedSizes([]);
    setSearchText("");
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategories.length === 0 ||
        (product.category && selectedCategories.includes(product.category));

      const matchesSize =
        selectedSizes.length === 0 ||
        (product.sizeCm && selectedSizes.includes(product.sizeCm));

      const text = searchText.trim().toLowerCase();
      const matchesSearch =
        text.length === 0 ||
        product.title.toLowerCase().includes(text) ||
        (product.category && product.category.toLowerCase().includes(text));

      return matchesCategory && matchesSize && matchesSearch;
    });
  }, [products, selectedCategories, selectedSizes, searchText]);

  /* ---------- UI ---------- */

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeadNavBar />

      <main className="px-4 pb-10 mx-auto max-w-7xl">
        <h1 className="mt-4 text-2xl font-bold tracking-tight md:text-3xl">
          Modelos en venta
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Explora todos los pares disponibles y filtra por categorías, tallas en
          CM y texto.
        </p>

        <div className="mt-6 grid gap-8 md:grid-cols-[260px_minmax(0,1fr)]">
          {/* SIDEBAR FILTROS */}
          <aside className="p-4 space-y-6 border shadow-sm rounded-2xl bg-card">
            {/* Filtro de texto */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar por modelo, categoría..."
                className="w-full px-3 py-2 text-sm transition border outline-none rounded-xl bg-background focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Categorías */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Categorías</label>
                <span className="text-xs text-muted-foreground">
                  {selectedCategories.length || "Todas"}
                </span>
              </div>
              <div className="space-y-1">
                {allCategories.length === 0 && !loading ? (
                  <p className="text-xs text-muted-foreground">
                    Aún no hay categorías asignadas.
                  </p>
                ) : (
                  allCategories.map((category) => (
                    <label
                      key={category}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                        className="w-4 h-4 border rounded"
                      />
                      <span>{category}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Tallas en CM */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Tallas (CM)</label>
                <span className="text-xs text-muted-foreground">
                  {selectedSizes.length || "Todas"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {allSizes.length === 0 && !loading ? (
                  <span className="text-xs text-muted-foreground">
                    Aún no hay variantes con talla.
                  </span>
                ) : (
                  allSizes.map((size) => {
                    const active = selectedSizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        className={[
                          "rounded-xl border px-3 py-1 text-xs font-medium transition",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-background hover:border-foreground/40",
                        ].join(" ")}
                      >
                        {size.toFixed(1)} cm
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Botón limpiar */}
            <button
              type="button"
              onClick={clearFilters}
              className="w-full px-3 py-2 text-xs font-medium transition border border-dashed rounded-xl text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            >
              Limpiar filtros
            </button>
          </aside>

          {/* LISTA DE PRODUCTOS */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {loading ? (
                  "Cargando productos..."
                ) : (
                  <>
                    Mostrando{" "}
                    <span className="font-semibold text-foreground">
                      {filteredProducts.length}
                    </span>{" "}
                    artículo(s)
                  </>
                )}
              </p>
            </div>

            {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}

            {loading ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-40 rounded-xl bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-sm text-center border border-dashed rounded-2xl text-muted-foreground">
                <p>No encontramos modelos con esos filtros.</p>
                <p>Prueba quitando alguna categoría o talla.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => (
                  <article
                    key={product.id}
                    className="flex flex-col overflow-hidden transition border shadow-sm group rounded-2xl bg-card hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="relative overflow-hidden aspect-square bg-muted">
                      <Image
                        src={product.image_url ?? "/logoGrasitaMex.ico"}
                        alt={product.title}
                        fill
                        className="object-cover transition duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex flex-col flex-1 gap-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-sm font-semibold line-clamp-2">
                          {product.title}
                        </h2>
                        <span className="text-sm font-bold whitespace-nowrap">
                          {moneyFromCents(product.price_cents)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{product.category ?? "Sin categoría"}</span>
                        {product.sizeCm && product.sizeCm > 0 && (
                          <span>{product.sizeCm.toFixed(1)} cm</span>
                        )}
                      </div>
                      <AddToCartControl
                        productId={product.id}
                        title={product.title}
                        priceCents={product.price_cents}
                        sizeOptions={product.sizeOptions}
                        className="pt-1"
                        buttonVariant="default"
                        buttonSize="sm"
                      />
                      <Button
                        asChild
                        size="sm"
                        className="w-full mt-2 rounded-xl"
                      >
                        <Link href={`/producto/${product.id}`}>
                          Ver detalle
                        </Link>
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
