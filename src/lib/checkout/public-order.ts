export type OrderSummaryItem = {
  id: number;
  title: string;
  size_label: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};

export type OrderAddress = {
  full_name?: string | null;
  phone?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  reference?: string | null;
};

export type PublicCheckoutOrder = {
  id: string;
  external_reference?: string | null;
  status: string;
  total_cents: number;
  currency: string;
  discount_amount_cents: number;
  coupon_code: string | null;
  created_at: string;
  shipping_address_id?: number | null;
  delivery_method?: "shipment" | "pickup";
  preference_id?: string | null;
  payment_status?: string | null;
  payment_status_detail?: string | null;
};

export interface PublicOrderData {
  order: PublicCheckoutOrder;
  items: OrderSummaryItem[];
  address: OrderAddress | null;
}

export interface PublicOrderLookup {
  orderId: string | null;
  preferenceId: string | null;
  token: string | null;
}

function normalizeParam(value?: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function resolvePublicOrderLookup(searchParams: {
  get: (name: string) => string | null;
}): PublicOrderLookup {
  const orderId =
    normalizeParam(searchParams.get("order_id")) ??
    normalizeParam(searchParams.get("external_reference"));

  const preferenceId = normalizeParam(searchParams.get("preference_id"));
  const token =
    normalizeParam(searchParams.get("token")) ??
    normalizeParam(searchParams.get("order_token"));

  return {
    orderId,
    preferenceId,
    token,
  };
}

export async function fetchPublicOrderSummary(
  lookup: PublicOrderLookup
): Promise<{ data: PublicOrderData | null; error: string | null }> {
  if (!lookup.token) {
    return {
      data: null,
      error: "Enlace inválido: falta el token de seguridad del pedido.",
    };
  }

  if (!lookup.orderId && !lookup.preferenceId) {
    return {
      data: null,
      error: "No se encontró la referencia de la orden.",
    };
  }

  const params = new URLSearchParams();
  params.set("token", lookup.token);

  if (lookup.orderId) {
    params.set("order_id", lookup.orderId);
  } else if (lookup.preferenceId) {
    params.set("preference_id", lookup.preferenceId);
  }

  try {
    const response = await fetch(`/api/orders/public-summary?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | PublicOrderData
      | { error?: string }
      | null;

    if (!response.ok) {
      return {
        data: null,
        error:
          (payload && "error" in payload && payload.error) ||
          "No fue posible obtener el resumen del pedido.",
      };
    }

    return {
      data: payload as PublicOrderData,
      error: null,
    };
  } catch (error) {
    console.error("[Checkout] Error fetching public order summary:", error);
    return {
      data: null,
      error: "Error al cargar los detalles del pedido.",
    };
  }
}
