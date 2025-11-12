"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import {
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
  CreditCard,
  ChevronRight,
  Star,
} from "lucide-react";
import { motion } from "framer-motion";

const metadata = {
  title: "GrasitaMex Sneakers — Tienda de Tenis",
  description:
    "Sneakers nuevos y usados, accesorios y más. Pagos con Mercado Pago. Envios a todo México.",
};

// ⚠️ Reemplaza estas rutas de imagen por las que tengas en /public o tu CDN
const heroImg = "/images/snkrsstore-blanco.jpg";
const catImgs = {
  nuevos: "/images/cat-nuevos.jpg",
  usados: "/images/cat-usados.jpg",
  accesorios: "/images/cat-accesorios.jpg",
  modelos: "/images/cat-modelos.jpg",
};

const demoProducts = [
  {
    id: "1",
    title: "Jordan 1 High University Blue",
    priceCents: 499900,
    status: "nuevo" as const,
    img: "/images/j1UNC.webp",
  },
  {
    id: "2",
    title: "New Balance 530 White/Grey (USADO)",
    priceCents: 219900,
    status: "usado" as const,
    img: "/images/nw530.webp",
  },
  {
    id: "3",
    title: "Laces Premium Waxed (Accesorio)",
    priceCents: 29900,
    status: "accesorio" as const,
    img: "/images/laces.jpg",
  },
];

function moneyFromCents(cents: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(cents / 100);
}

/** Badges con los colores del brand */
function BadgeByStatus({
  status,
}: {
  status: "nuevo" | "usado" | "accesorio";
}) {
  const map = {
    nuevo: { label: "Nuevo", className: "bg-primary text-primary-foreground" },
    usado: {
      label: "Usado",
      className: "bg-secondary text-secondary-foreground",
    },
    accesorio: {
      label: "Accesorio",
      className:
        "border border-border text-foreground bg-background/40 backdrop-blur",
    },
  } as const;
  const { label, className } = map[status];
  return <Badge className={className}>{label}</Badge>;
}

function FeaturedProductCard({ p }: { p: (typeof demoProducts)[number] }) {
  return (
    <Card className="overflow-hidden transition-colors border group rounded-2xl border-primary/30 hover:border-primary/60">
      <CardHeader className="p-0">
        <div className="relative w-full overflow-hidden aspect-4/3">
          <Image
            src={p.img}
            alt={p.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute left-3 top-3">
            <BadgeByStatus status={p.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-1">
        <CardTitle className="text-base leading-tight">{p.title}</CardTitle>
        <CardDescription className="text-sm">
          {moneyFromCents(p.priceCents)}
        </CardDescription>
      </CardContent>
      <CardFooter className="flex items-center justify-between p-4">
        <Link
          href={`/producto/${p.id}`}
          className="text-sm font-medium hover:underline"
        >
          Ver producto
        </Link>
        <Button asChild size="sm" className="rounded-xl">
          <Link href={`/checkout?pid=${p.id}`}>Comprar</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function Home() {
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Announcement bar */}
      <div className="w-full px-4 py-2 text-xs text-center bg-muted/40 sm:text-sm">
        Envíos a todo México • Pagos seguros con Mercado Pago • Soporte por
        WhatsApp
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex items-center justify-between h-16 px-4 mx-auto max-w-7xl">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Image
              src="/logoGrasitaMex.ico"
              alt="GrasitaMex"
              width={30}
              height={30}
              className="rounded"
            />
            <span className="text-lg tracking-tight">GrasitaMex</span>
          </Link>
          <nav className="items-center hidden gap-6 md:flex">
            <Link href="/categorias" className="text-sm hover:underline">
              Categorías
            </Link>
            <Link href="/modelos" className="text-sm hover:underline">
              Modelos
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {/* Outline con brand */}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl border-primary text-primary hover:bg-primary/10"
            >
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="rounded-xl">
              <Link href="/tienda">Comprar ahora</Link>
            </Button>
          </div>
        </div>
        <Separator />
      </header>

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
                <Link href="/tienda" className="flex items-center gap-2">
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
                src={heroImg}
                alt="Colección de sneakers"
                fill
                priority
                className="object-cover"
              />
              {/* overlay dorado sutil */}
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[hsl(var(--primary))/18%] via-transparent to-transparent" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits / Trust */}
      <section className="px-4 py-8 mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Benefit
            icon={<Truck className="w-5 h-5" />}
            title="Envío a todo MX"
            desc="Rastreo en tiempo real"
          />
          <Benefit
            icon={<ShieldCheck className="w-5 h-5" />}
            title="Pago seguro"
            desc="Mercado Pago"
          />
          <Benefit
            icon={<RotateCcw className="w-5 h-5" />}
            title="Devoluciones"
            desc="Hasta 7 días"
          />
          <Benefit
            icon={<Headphones className="w-5 h-5" />}
            title="Soporte"
            desc="WhatsApp y correo"
          />
        </div>
      </section>

      {/* Category grid */}
      <section className="px-4 py-6 mx-auto max-w-7xl">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Compra por categoría
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Explora nuestro catálogo y agrega al carrito.
        </p>
        <div className="grid grid-cols-1 gap-4 mt-6 sm:grid-cols-2 lg:grid-cols-4">
          <CategoryCard
            title="Nuevos"
            href="/categoria/nuevos"
            img={catImgs.nuevos}
          />
          <CategoryCard
            title="Usados"
            href="/categoria/usados"
            img={catImgs.usados}
          />
          <CategoryCard
            title="Accesorios"
            href="/categoria/accesorios"
            img={catImgs.accesorios}
          />
          <CategoryCard title="Modelos" href="/modelos" img={catImgs.modelos} />
        </div>
      </section>

      {/* Featured products */}
      <section className="px-4 py-10 mx-auto max-w-7xl">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Destacados
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Se actualiza conforme agregues productos desde el panel admin.
            </p>
          </div>
          <Button asChild variant="link" className="px-0">
            <Link href="/tienda" className="flex items-center gap-1">
              Ver todo <ChevronRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-5 mt-6 sm:grid-cols-2 lg:grid-cols-3">
          {demoProducts.map((p) => (
            <FeaturedProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>

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
                <Link href="/tienda">Empezar a comprar</Link>
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
                // TODO: Conecta a tu endpoint /api/subscribe o Supabase
                setEmail("");
                alert("¡Gracias! Te suscribiste correctamente.");
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
              <Button type="submit" className="px-6 h-11 rounded-xl">
                Suscribirme
              </Button>
            </form>
          </div>
        </Card>
      </section>

      <Footer />
    </div>
  );
}

function CategoryCard({
  title,
  href,
  img,
}: {
  title: string;
  href: string;
  img: string;
}) {
  return (
    <Link href={href} className="group">
      <div className="relative overflow-hidden border rounded-2xl border-border">
        <div className="relative w-full aspect-4/3">
          <Image
            src={img}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="absolute inset-0 pointer-events-none bg-linear-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute bottom-3 left-3">
          <h3 className="text-lg font-semibold text-white drop-shadow">
            {title}
          </h3>
        </div>
      </div>
    </Link>
  );
}

function Benefit({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-xl">
      <div className="grid border rounded-full h-9 w-9 place-items-center bg-card">
        {icon}
      </div>
      <div className="leading-tight">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
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
              <Link className="hover:underline" href="/tienda">
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
          <span>Hecho con Next.js + shadcn/ui</span>
        </div>
      </div>
    </footer>
  );
}
