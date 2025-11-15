"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartItem = {
  id: number;
  title: string;
  price_cents: number;
  size: string;
  quantity: number;
};

type AddItemPayload = Omit<CartItem, "quantity"> & { quantity?: number };

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  isHydrated: boolean;
  addItem: (item: AddItemPayload) => void;
  removeItem: (productId: number, size: string) => void;
  updateQuantity: (productId: number, size: string, quantity: number) => void;
  clearCart: () => void;
};

const STORAGE_KEY = "gr-cart";

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (error) {
      console.error("No se pudo leer el carrito desde localStorage", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("No se pudo guardar el carrito en localStorage", error);
    }
  }, [items, hydrated]);

  const addItem = useCallback((payload: AddItemPayload) => {
    setItems((prev) => {
      const quantity = payload.quantity ?? 1;
      const existingIndex = prev.findIndex(
        (item) => item.id === payload.id && item.size === payload.size
      );

      if (existingIndex >= 0) {
        const clone = [...prev];
        clone[existingIndex] = {
          ...clone[existingIndex],
          quantity: clone[existingIndex].quantity + quantity,
        };
        return clone;
      }

      return [
        ...prev,
        {
          id: payload.id,
          title: payload.title,
          price_cents: payload.price_cents,
          size: payload.size,
          quantity,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId: number, size: string) => {
    setItems((prev) =>
      prev.filter((item) => !(item.id === productId && item.size === size))
    );
  }, []);

  const updateQuantity = useCallback(
    (productId: number, size: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId, size);
        return;
      }
      setItems((prev) =>
        prev.map((item) =>
          item.id === productId && item.size === size
            ? { ...item, quantity }
            : item
        )
      );
    },
    [removeItem]
  );

  const clearCart = useCallback(() => setItems([]), []);

  const { totalItems, totalAmount } = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.totalItems += item.quantity;
        acc.totalAmount += item.price_cents * item.quantity;
        return acc;
      },
      { totalItems: 0, totalAmount: 0 }
    );
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalItems,
      totalAmount,
      isHydrated: hydrated,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [items, totalItems, totalAmount, hydrated, addItem, removeItem, updateQuantity, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart debe usarse dentro de CartProvider");
  }
  return ctx;
}
