"use client";

import { useMemo, useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCart } from "@/context/cart-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ButtonVariant = ComponentProps<typeof Button>["variant"];
type ButtonSize = ComponentProps<typeof Button>["size"];

export type SizeOption = {
  id: number; // variant_id
  label: string;
  available: number;
  priceCents?: number;
  sku?: string | null;
};

type AddToCartControlProps = {
  productId: number;
  title: string;
  priceCents: number;
  currency?: string;
  sizeOptions: SizeOption[];
  className?: string;
  buttonText?: string;
  selectPlaceholder?: string;
  buttonVariant?: ButtonVariant;
  buttonSize?: ButtonSize;
  buttonsContainerClassName?: string;
};

export function AddToCartControl({
  productId,
  title,
  priceCents,
  currency = 'MXN',
  sizeOptions,
  className,
  buttonText = "Agregar al carrito",
  selectPlaceholder = "Selecciona talla",
  buttonVariant = "secondary",
  buttonSize = "sm",
  buttonsContainerClassName = "flex gap-2",
}: AddToCartControlProps) {
  const { addItem, items } = useCart();
  const { toast } = useToast();
  const [selectedVariantId, setSelectedVariantId] = useState("");

  const normalizedOptions = useMemo(
    () => sizeOptions.filter((option) => option.available > 0),
    [sizeOptions]
  );
  const hasSizes = normalizedOptions.length > 0;
  const selectedOption = normalizedOptions.find(
    (option) => String(option.id) === selectedVariantId
  );
  const alreadyInCart =
    items.find(
      (item) => item.id === productId && (item.variant_id === selectedOption?.id || (!item.variant_id && item.size === selectedOption?.label))
    )?.quantity ?? 0;
  const remaining = selectedOption
    ? Math.max(selectedOption.available - alreadyInCart, 0)
    : 0;
  const canAddSelected = Boolean(selectedOption) && remaining > 0;

  const router = useRouter();

  const handleAdd = () => {
    if (!hasSizes) return;
    if (!selectedOption) {
      toast({
        title: "Selecciona una talla",
        description: "Debes elegir una talla antes de agregar al carrito.",
        variant: "destructive",
      });
      return false;
    }

    if (!canAddSelected) {
      toast({
        title: "Sin stock",
        description:
          "No hay suficiente inventario para la talla seleccionada.",
        variant: "destructive",
      });
      return false;
    }

    addItem({
      id: productId,
      variant_id: selectedOption?.id, // Pass variant_id
      title,
      price_cents: selectedOption.priceCents ?? priceCents,
      size: selectedOption.label,
      quantity: 1,
      maxAvailable: selectedOption?.available,
    });

    toast({
      title: "Agregado al carrito",
      description: `${title} (${selectedOption.label}) se agregó correctamente.`,
    });
    return true;
  };

  const handleBuyNow = () => {
    const success = handleAdd();
    if (success) {
      router.push("/checkout");
    }
  };

  const helperMessage = !hasSizes
    ? "Sin tallas disponibles por ahora."
    : selectedOption
      ? remaining > 0
        ? `Disponibles: ${remaining} (de ${selectedOption.available})`
        : "Sin stock para esta talla."
      : "Selecciona una talla para ver disponibilidad.";

  return (
    <div className={cn("space-y-2", className)}>
      <Select
        value={selectedVariantId}
        onValueChange={setSelectedVariantId}
        disabled={!hasSizes}
      >
        <SelectTrigger className="rounded-xl">
          <SelectValue
            placeholder={
              hasSizes ? selectPlaceholder : "Sin tallas disponibles"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {normalizedOptions.map((option) => (
            <SelectItem key={option.id} value={String(option.id)}>
              {option.label}{option.sku ? ` · ${option.sku}` : ''} ({option.available} disp.) · {new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format((option.priceCents ?? priceCents) / 100)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedOption && (
        <p className="text-sm font-medium">Precio de esta variante: {new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format((selectedOption.priceCents ?? priceCents) / 100)}</p>
      )}
      <p className="text-xs text-muted-foreground">{helperMessage}</p>
      <div className={buttonsContainerClassName}>
        <Button
          size={buttonSize}
          variant={buttonVariant}
          className="flex-1 rounded-xl"
          disabled={!canAddSelected}
          onClick={handleAdd}
        >
          {buttonText}
        </Button>
        <Button
          size={buttonSize}
          className="flex-1 rounded-xl"
          disabled={!canAddSelected}
          onClick={handleBuyNow}
        >
          Comprar
        </Button>
      </div>
    </div>
  );
}
