"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon, ShoppingCart } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCart } from "@/context/cart-context";
import { useRouter } from "next/navigation";


/* ---------- theme toggle ---------- */

function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("theme");
    const isDark = saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  if (!mounted) return null;
  const toggle = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label="Cambiar tema"
      className="rounded-xl"
      title="Cambiar tema"
    >
      <Sun className="w-4 h-4 dark:hidden" />
      <Moon className="hidden w-4 h-4 dark:block" />
    </Button>
  );
}

export default function HeadNavBar() {
  const [authState, setAuthState] = useState<{
    loading: boolean;
    role: "admin" | "costumer" | null;
  }>({ loading: true, role: null });
  const [cartOpen, setCartOpen] = useState(false);
  const { items, totalItems, totalAmount, isHydrated, removeItem } = useCart();
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const supa = supabaseBrowser();

    const resolveRole = async (userId: string | null) => {
      if (!active) return;
      if (!userId) {
        setAuthState({ loading: false, role: null });
        return;
      }

      setAuthState((prev) => ({ ...prev, loading: true }));
      const { data: profile, error } = await supa
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (!active) return;
      if (error) {
        console.error("Error al obtener el rol del usuario", error);
      }

      const normalizedRole: "admin" | "costumer" =
        profile?.role === "admin" ? "admin" : "costumer";

      setAuthState({ loading: false, role: normalizedRole });
    };

    supa.auth.getSession().then(({ data }) => {
      resolveRole(data.session?.user.id ?? null);
    });

    const { data: authListener } = supa.auth.onAuthStateChange(
      (_event : any, session: any) => {
        resolveRole(session?.user.id ?? null);
      }
    );

    return () => {
      active = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const hasSession = Boolean(authState.role);
  const dashboardHref = authState.role === "admin" ? "/admin" : "/costumer";
  const authHref = hasSession ? dashboardHref : "/login";
  const authLabel = authState.loading
    ? "Cargando..."
    : hasSession
    ? authState.role === "admin"
      ? "Panel admin"
      : "Panel cliente"
    : "Iniciar sesión";

  const formatMoney = (cents: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format((cents ?? 0) / 100);

  return (
    <>
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
            <Link href="/" className="text-sm hover:underline">
              Inicio
            </Link>
            <Link href="/categorias" className="text-sm hover:underline">
              Categorías
            </Link>
            <Link href="/modelos" className="text-sm hover:underline">
              Ver Todo
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl border-primary text-primary hover:bg-primary/10"
              aria-busy={authState.loading}
            >
              <Link href={authHref}>{authLabel}</Link>
            </Button>
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl border-primary text-primary hover:bg-primary/10"
                aria-label="Abrir carrito"
                aria-expanded={cartOpen}
                aria-controls="cart-accordion"
                onClick={() => setCartOpen((prev) => !prev)}
              >
                <ShoppingCart className="w-4 h-4" />
                {totalItems > 0 && (
                  <span className="absolute px-1 text-[10px] font-semibold text-white bg-primary rounded-full -top-1 -right-1">
                    {totalItems}
                  </span>
                )}
              </Button>
              <div
                id="cart-accordion"
                className={`absolute right-0 mt-2 w-80 rounded-2xl border bg-background shadow-lg transition-all duration-200 ${
                  cartOpen
                    ? "opacity-100 visible translate-y-0"
                    : "invisible opacity-0 -translate-y-2"
                }`}
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Carrito</span>
                    <span className="text-xs text-muted-foreground">
                      {isHydrated ? `${totalItems} articulo(s)` : "Cargando..."}
                    </span>
                  </div>
                  <Separator />
                  {!isHydrated ? (
                    <p className="text-sm text-muted-foreground">
                      Recuperando carrito...
                    </p>
                  ) : items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aún no tienes artículos agregados.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-auto pr-1">
                      {items.map((item) => (
                        <div
                          key={`${item.id}-${item.size}`}
                          className="p-3 border rounded-xl bg-muted/30 space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium line-clamp-2">
                                {item.title}
                              </p>
                              <div className="mt-1 text-xs text-muted-foreground">
                                Talla:{" "}
                                <span className="font-semibold">
                                  {item.size}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1 text-xs">
                                <span>Cantidad: {item.quantity}</span>
                                <span className="font-semibold">
                                  {formatMoney(item.price_cents)}
                                </span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground"
                              onClick={() => removeItem(item.id, item.size)}
                              aria-label={`Eliminar ${item.title}`}
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {isHydrated && items.length > 0 && (
                    <>
                      <div className="pt-2 text-sm font-semibold border-t">
                        Total: {formatMoney(totalAmount)}
                      </div>
                      <Button
                        className="w-full mt-2 rounded-xl"
                        onClick={() => {
                          setCartOpen(false);
                          router.push("/checkout");
                        }}
                      >
                        Proceder con el pago
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <Separator />
      </header>
    </>
  );
}
