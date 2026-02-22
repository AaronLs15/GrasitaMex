"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Product = {
  id: number;
  title: string;
  price_cents: number;
  currency: string;
};

type Variant = {
  id: number;
  size_label: string;
  sku: string | null;
  qty: number;
  active: boolean;
};

interface PosSaleDialogProps {
  product: Product;
}

function centsToInputValue(cents: number): string {
  return (Math.max(0, cents) / 100).toFixed(2);
}

export default function PosSaleDialog({ product }: PosSaleDialogProps) {
  const [open, setOpen] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [variantId, setVariantId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [priceInput, setPriceInput] = useState(centsToInputValue(product.price_cents));
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [note, setNote] = useState("");

  const router = useRouter();
  const { toast } = useToast();

  const selectedVariant = useMemo(
    () => variants.find((item) => String(item.id) === variantId) ?? null,
    [variants, variantId]
  );

  useEffect(() => {
    if (!open) return;
    const loadVariants = async () => {
      setLoadingVariants(true);
      const supa = supabaseBrowser();
      const { data, error } = await supa
        .from("product_variants")
        .select("id, size_label, sku, qty, active")
        .eq("product_id", product.id)
        .eq("active", true)
        .order("size_label", { ascending: true });

      if (error) {
        toast({
          title: "Error al cargar variantes",
          description: error.message,
          variant: "destructive",
        });
        setVariants([]);
        setVariantId("");
        setLoadingVariants(false);
        return;
      }

      const safeVariants = (data ?? []) as Variant[];
      setVariants(safeVariants);

      const firstWithStock = safeVariants.find((item) => item.qty > 0) ?? safeVariants[0];
      setVariantId(firstWithStock ? String(firstWithStock.id) : "");
      setLoadingVariants(false);
    };

    loadVariants();
  }, [open, product.id, toast]);

  useEffect(() => {
    if (!open) return;
    setPriceInput(centsToInputValue(product.price_cents));
    setQuantity(1);
    setCustomerName("");
    setCustomerEmail("");
    setNote("");
  }, [open, product.price_cents]);

  async function handleSubmit() {
    if (!variantId) {
      toast({
        title: "Selecciona una variante",
        description: "Necesitas elegir talla/variante para registrar la venta.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast({
        title: "Cantidad inválida",
        description: "Ingresa una cantidad mayor a 0.",
        variant: "destructive",
      });
      return;
    }

    if (selectedVariant && quantity > selectedVariant.qty) {
      toast({
        title: "Stock insuficiente",
        description: `Stock disponible: ${selectedVariant.qty}.`,
        variant: "destructive",
      });
      return;
    }

    const mxnPrice = Number(priceInput);
    if (!Number.isFinite(mxnPrice) || mxnPrice < 0) {
      toast({
        title: "Precio inválido",
        description: "Ingresa un precio válido para registrar la venta.",
        variant: "destructive",
      });
      return;
    }

    const unitPriceCents = Math.round(mxnPrice * 100);

    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/pos-sale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variant_id: Number(variantId),
          quantity,
          unit_price_cents: unitPriceCents,
          customer_name: customerName || null,
          customer_email: customerEmail || null,
          note: note || null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; order_id?: string; error?: string }
        | null;

      if (!response.ok || !payload?.success || !payload.order_id) {
        throw new Error(payload?.error || "No se pudo registrar la venta física.");
      }

      toast({
        title: "Venta física registrada",
        description: `Orden #${payload.order_id.slice(0, 8)} creada correctamente.`,
      });
      setOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo registrar la venta física.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          Venta física
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar venta física</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">{product.title}</p>
            <p className="text-muted-foreground">
              Precio lista: {product.currency} {centsToInputValue(product.price_cents)}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Variante</Label>
            {loadingVariants ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando variantes...
              </div>
            ) : (
              <Select value={variantId} onValueChange={setVariantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una variante" />
                </SelectTrigger>
                <SelectContent>
                  {variants.map((variant) => (
                    <SelectItem key={variant.id} value={String(variant.id)}>
                      {variant.size_label} | Stock: {variant.qty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!loadingVariants && variants.length === 0 && (
              <p className="text-xs text-destructive">
                Este producto no tiene variantes activas para vender.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`pos-quantity-${product.id}`}>Cantidad</Label>
              <Input
                id={`pos-quantity-${product.id}`}
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`pos-price-${product.id}`}>Precio vendido (MXN)</Label>
              <Input
                id={`pos-price-${product.id}`}
                type="number"
                min={0}
                step="0.01"
                value={priceInput}
                onChange={(event) => setPriceInput(event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`pos-customer-name-${product.id}`}>Nombre cliente (opcional)</Label>
              <Input
                id={`pos-customer-name-${product.id}`}
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Cliente mostrador"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`pos-customer-email-${product.id}`}>Email (opcional)</Label>
              <Input
                id={`pos-customer-email-${product.id}`}
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                placeholder="cliente@correo.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`pos-note-${product.id}`}>Nota interna (opcional)</Label>
            <Textarea
              id={`pos-note-${product.id}`}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ej. Venta mostrador sábado, pago en efectivo."
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              loadingVariants ||
              variants.length === 0 ||
              !variantId
            }
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              "Registrar venta"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
