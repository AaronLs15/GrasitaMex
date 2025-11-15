"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  ChevronRight,
  Star,
} from "lucide-react";
import { motion } from "framer-motion";
import { BtnSuscribe } from "@/components/landing/btn-suscribe";
import HeadNavBar from "@/components/HeadNavBar";
import {
  AddToCartControl,
  type SizeOption as CartSizeOption,
} from "@/components/cart/AddToCartControl";

/* ---------- tipos mínimos ---------- */
type Category = {
  id: number;
  name: string;
  slug: string;
  kind?: "general" | "model";
};

type Product = {
  id: number;
  title: string;
  price_cents: number;
  condition: "new" | "used" | string;
  created_at: string;
  image_url: string | null;           // derivada de product_images
  sizeOptions: CartSizeOption[];      // tallas disponibles con stock
};

/* ---------- utilidades ---------- */
function moneyFromCents(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format((cents ?? 0) / 100);
}


/* ---------- badges ---------- */
function BadgeByStatus({ condition }: { condition: Product["condition"] }) {
  const map: Record<string, { label: string; className: string }> = {
    new: { label: "Nuevo", className: "bg-primary text-primary-foreground" },
    used: { label: "Usado", className: "bg-secondary text-secondary-foreground" },
  };
  const { label, className } = map[condition] ?? { label: String(condition), className: "border border-border" };
  return <Badge className={className}>{label}</Badge>;
}

/* ===================== Card de producto ===================== */
function FeaturedProductCard({ p }: { p: Product }) {
  const img = p.image_url ?? "/logoGrasitaMex.ico";
  return (
    <Card className="overflow-hidden transition-colors border group rounded-2xl border-primary/30 hover:border-primary/60">
      <CardHeader className="p-0">
        <div className="relative w-full overflow-hidden aspect-square sm:aspect-4/3">
          <Image 
            src={img} 
            alt={p.title} 
            fill 
            className="object-cover transition-transform duration-300 group-hover:scale-105" 
          />
          <div className="absolute left-2 top-2 sm:left-3 sm:top-3">
            <BadgeByStatus condition={p.condition} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-1 sm:p-4">
        <CardTitle className="text-sm leading-tight sm:text-base line-clamp-2">{p.title}</CardTitle>
        <CardDescription className="text-xs font-semibold sm:text-sm">
          {moneyFromCents(p.price_cents)}
        </CardDescription>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 p-3 sm:p-4">
        <AddToCartControl
          productId={p.id}
          title={p.title}
          priceCents={p.price_cents}
          sizeOptions={p.sizeOptions}
          className="w-full"
          buttonVariant="default"
          buttonSize="sm"
        />
        <div className="flex flex-col items-stretch justify-between gap-2 text-xs sm:flex-row sm:items-center sm:text-sm">
          <Link
            href={`/producto/${p.id}`}
            className="text-center font-medium hover:underline sm:text-left"
          >
            Ver detalles
          </Link>
          <Button asChild size="sm" className="w-full rounded-xl sm:w-auto">
            <Link href={`/checkout?pid=${p.id}`}>Comprar</Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

/* ===================== Card de categoría (solo título) ===================== */
function CategoryCardText({ title, href }: { title: string; href: string }) {
  return (
    <Link href={href} className="group">
      <Card className="h-full p-4 transition-colors border sm:p-5 rounded-2xl border-border hover:border-primary/50">
        <div className="flex items-center justify-between h-20 sm:h-28">
          <h3 className="pr-2 text-base font-semibold sm:text-lg line-clamp-2">{title}</h3>
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 opacity-60 group-hover:opacity-100 shrink-0" />
        </div>
      </Card>
    </Link>
  );
}

export default function Home() {
  const [email, setEmail] = useState("");

  const [categories, setCategories] = useState<Category[] | null>(null);
  const [recent, setRecent] = useState<Product[] | null>(null);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingProds, setLoadingProds] = useState(true);

  useEffect(() => {
    // CATEGORÍAS: solo 'general'
    (async () => {
      setLoadingCats(true);
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, kind")
        .eq("kind", "general")
        .order("name", { ascending: true });
      if (error) {
        console.error("Categories error:", error);
        setCategories([]);
      } else {
        setCategories(data as Category[]);
      }
      setLoadingCats(false);
    })();

    // TOP 3 productos recientes con primera imagen
    (async () => {
      setLoadingProds(true);
      const { data, error } = await supabase
        .from("products")
        .select("id, title, price_cents, condition, created_at, product_images!left(url, position), product_variants(size_label, qty, active)")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) {
        console.error("Products error:", error);
        setRecent([]);
      } else {
        // escoger la imagen de menor position (o null)
        const mapped: Product[] = (data as any[]).map((row) => {
          const imgs = (row.product_images ?? []) as { url: string; position: number }[];
          const first = imgs.sort((a, b) => (a?.position ?? 0) - (b?.position ?? 0))[0];
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
          const sizeOptions = Array.from(sizeMap.entries()).map(
            ([label, available]) => ({ label, available })
          );
          return {
            id: row.id,
            title: row.title,
            price_cents: row.price_cents,
            condition: row.condition,
            created_at: row.created_at,
            image_url: first?.url ?? null,
            sizeOptions,
          };
        });
        setRecent(mapped);
      }
      setLoadingProds(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Announcement bar */}
      <div className="w-full px-4 py-2 text-xs text-center bg-muted/40 sm:text-sm">
        Envíos a todo México • Pagos seguros con Mercado Pago • Soporte por
        WhatsApp
      </div>

      <HeadNavBar/>

      {/* Hero */}
      <section className="relative">
        <div className="grid items-center grid-cols-1 gap-8 px-4 py-10 mx-auto max-w-7xl sm:py-16 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="order-2 md:order-1"
          >
            <Badge variant="secondary" className="mb-4">
              Nueva colección • Otoño 2025
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Sneakers para el diario.{" "}
              <span className="text-primary">Estilo sin esfuerzo.</span>
            </h1>
            <p className="max-w-xl mt-4 text-muted-foreground">
              Encuentra tenis nuevos y usados en excelente estado, accesorios y
              tus modelos favoritos como Jordan 1 y New Balance 530. Pagos
              seguros con Mercado Pago y envíos a todo México.
            </p>
            <div className="flex flex-col gap-3 mt-6 sm:flex-row">
              <Button asChild size="lg" className="px-6 rounded-2xl">
                <Link href="/modelos" className="flex items-center gap-2">
                  Comprar ahora <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="px-6 rounded-2xl border-primary text-primary hover:bg-primary/10"
              >
                <Link href="/modelos">Ver modelos</Link>
              </Button>
            </div>
            <div className="flex items-center gap-4 mt-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4" />
                <span>4.9/5 clientes</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-muted" />
              <span>Devoluciones fáciles</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="order-1 md:order-2"
          >
            <div className="relative w-full overflow-hidden shadow aspect-4/3 rounded-3xl">
              <Image
                src="/images/snkrsstore-blanco.jpg"
                alt="Colección de sneakers"
                fill
                priority
                className="object-cover dark:hidden"
              />
              <Image
                src="/images/snkrsstore-dark.jpg"
                alt="Colección de sneakers"
                fill
                priority
                className="hidden object-cover dark:block"
              />
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[hsl(var(--primary))/18%] via-transparent to-transparent" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== Categorías (dinámico, sin imágenes) ===== */}
      <CategoriesSection categories={categories} loadingCats={loadingCats} />

      {/* Top 4 artículos recientes */}
      <FeaturedProductsSection recent={recent} loadingProds={loadingProds} />

      {/* Payment banner */}
      <section className="px-4 pb-10 mx-auto max-w-7xl">
        <Card className="overflow-hidden border-dashed rounded-3xl">
          <div className="grid grid-cols-1 items-center gap-6 p-6 sm:grid-cols-[1.2fr,0.8fr] sm:p-8">
            <div>
              <h3 className="text-xl font-semibold">Paga fácil y seguro</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Aceptamos tarjetas, SPEI y efectivo en OXXO a través de Mercado
                Pago. Tus datos están protegidos.
              </p>
              <div className="flex items-center gap-3 mt-4 text-sm text-muted-foreground">
                <CreditCard className="w-4 h-4" />
                <span>Pagos en 3, 6, 9 o 12 MSI (según promoción)</span>
              </div>
            </div>
            <div className="justify-self-end">
              <Button asChild size="lg" className="rounded-2xl">
                <Link href="/modelos">Empezar a comprar</Link>
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* Newsletter */}
      <section className="px-4 pb-16 mx-auto max-w-7xl">
        <Card className="rounded-3xl">
          <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 sm:p-8">
            <div>
              <h3 className="text-xl font-semibold">Únete al club</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Ofertas, drops y noticias directo a tu correo.
              </p>
            </div>
            <form
              className="flex items-center w-full gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                // TODO: Conecta a endpoint /api/subscribe o Supabase
                setEmail("");
              }}
            >
              <Input
                type="email"
                placeholder="tu@correo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl"
              />
              <BtnSuscribe
                from="bottom"
                type="submit"
                className="px-6 h-11 rounded-xl bg-primary"
                variant="outline"
              >
                Suscribirme
              </BtnSuscribe>
            </form>
          </div>
        </Card>
      </section>

      <Footer />
    </div>
  );
}

/* ---------- helpers UI ---------- */

export function CategoriesSection({ categories, loadingCats }: { 
  categories: Category[] | null; 
  loadingCats: boolean;
}) {
  return (
    <section className="px-4 py-6 mx-auto max-w-7xl">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Compra por categoría</h2>
      <p className="mt-1 text-sm text-muted-foreground">Explora nuestro catálogo y agrega al carrito.</p>

      {loadingCats ? (
        <div className="grid grid-cols-2 gap-3 mt-6 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-20 sm:h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : categories && categories.length ? (
        <div className="grid grid-cols-2 gap-3 mt-6 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          {categories.map((c) => (
            <CategoryCardText key={c.id} title={c.name} href={`/categoria/${c.slug}`} />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Aún no hay categorías generales.</p>
      )}
    </section>
  );
}

export function FeaturedProductsSection({ recent, loadingProds }: {
  recent: Product[] | null;
  loadingProds: boolean;
}) {
  return (
    <section className="px-4 py-10 mx-auto max-w-7xl">
      <div className="flex flex-col items-start justify-between gap-2 mb-6 sm:flex-row sm:items-end sm:gap-0">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Destacados</h2>
          <p className="mt-1 text-sm text-muted-foreground">Los 3 artículos agregados más recientemente.</p>
        </div>
        <Button asChild variant="link" className="px-0 -ml-4 sm:ml-0">
          <Link href="/modelos" className="flex items-center gap-1 text-sm">
            Ver todo <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      {loadingProds ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
          {[1,2,3].map(i => (
            <div key={i} className="h-64 sm:h-72 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : recent && recent.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
          {recent.map((p) => <FeaturedProductCard key={p.id} p={p} />)}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Aún no hay productos publicados.</p>
      )}
    </section>
  );
}


function Footer() {
  return (
    <footer className="border-t">
      <div className="grid grid-cols-1 gap-8 px-4 py-10 mx-auto max-w-7xl sm:grid-cols-4">
        <div className="space-y-2">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Image
              src="/logoGrasitaMex.ico"
              alt="GrasitaMex"
              width={28}
              height={28}
              className="rounded"
            />
            <span>GrasitaMex</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Sneakers y accesorios, con envíos a todo México.
          </p>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Tienda</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              <Link className="hover:underline" href="/modelos">
                Todos los productos
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/categoria/nuevos">
                Nuevos
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/categoria/usados">
                Usados
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/categoria/accesorios">
                Accesorios
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Soporte</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              <Link className="hover:underline" href="/envios">
                Envíos
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/devoluciones">
                Devoluciones
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/contacto">
                Contacto
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Administración</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>
              <Link className="hover:underline" href="/admin">
                Panel
              </Link>
            </li>
            <li>
              <Link className="hover:underline" href="/pedidos">
                Pedidos
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="bg-muted/40">
        <div className="flex items-center justify-between px-4 py-4 mx-auto text-xs max-w-7xl text-muted-foreground">
          <span>
            © {new Date().getFullYear()} GrasitaMex. Todos los derechos
            reservados.
          </span>
          <span>By ALDevelopment</span>
        </div>
      </div>
    </footer>
  );
}
