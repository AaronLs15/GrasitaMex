"use client";

import { useMemo, useState, type ComponentProps } from "react";
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
  label: string;
  available: number;
};

type AddToCartControlProps = {
  productId: number;
  title: string;
  priceCents: number;
  sizeOptions: SizeOption[];
  className?: string;
  buttonText?: string;
  selectPlaceholder?: string;
  buttonVariant?: ButtonVariant;
  buttonSize?: ButtonSize;
};

export function AddToCartControl({
  productId,
  title,
  priceCents,
  sizeOptions,
  className,
  buttonText = "Agregar al carrito",
  selectPlaceholder = "Selecciona talla",
  buttonVariant = "secondary",
  buttonSize = "sm",
}: AddToCartControlProps) {
  const { addItem, items } = useCart();
  const { toast } = useToast();
  const [selectedSize, setSelectedSize] = useState("");

  const normalizedOptions = useMemo(
    () => sizeOptions.filter((option) => option.available > 0),
    [sizeOptions]
  );
  const hasSizes = normalizedOptions.length > 0;
  const selectedOption = normalizedOptions.find(
    (option) => option.label === selectedSize
  );
  const alreadyInCart =
    items.find(
      (item) => item.id === productId && item.size === selectedSize
    )?.quantity ?? 0;
  const remaining = selectedOption
    ? Math.max(selectedOption.available - alreadyInCart, 0)
    : 0;
  const canAddSelected = Boolean(selectedOption) && remaining > 0;

  const handleAdd = () => {
    if (!hasSizes) return;
    if (!selectedSize) {
      toast({
        title: "Selecciona una talla",
        description: "Debes elegir una talla antes de agregar al carrito.",
        variant: "destructive",
      });
      return;
    }

    if (!canAddSelected) {
      toast({
        title: "Sin stock",
        description:
          "No hay suficiente inventario para la talla seleccionada.",
        variant: "destructive",
      });
      return;
    }

    addItem({
      id: productId,
      title,
      price_cents: priceCents,
      size: selectedSize,
      quantity: 1,
    });

    toast({
      title: "Agregado al carrito",
      description: `${title} (${selectedSize}) se agregó correctamente.`,
    });
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
        value={selectedSize}
        onValueChange={setSelectedSize}
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
            <SelectItem key={option.label} value={option.label}>
              {option.label} ({option.available} disp.)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{helperMessage}</p>
      <Button
        size={buttonSize}
        variant={buttonVariant}
        className="w-full rounded-xl"
        disabled={!canAddSelected}
        onClick={handleAdd}
      >
        {buttonText}
      </Button>
    </div>
  );
}
