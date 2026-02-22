import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type RawOrderItem = {
  id?: number | null;
  title?: string | null;
  size_label?: string | null;
  quantity?: number | null;
  unit_price_cents?: number | null;
  line_total_cents?: number | null;
};

type RawAddress = {
  full_name?: string | null;
  phone?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  reference?: string | null;
};

type RawOrder = {
  id: string;
  external_reference: string | null;
  status: string;
  total_cents: number;
  currency: string;
  discount_amount_cents: number;
  coupon_code: string | null;
  created_at: string;
  shipping_address_id: number | null;
  delivery_method: "shipment" | "pickup" | null;
  preference_id: string | null;
  payment_status: string | null;
  order_items?: RawOrderItem[] | RawOrderItem | null;
  addresses?: RawAddress[] | RawAddress | null;
};

function normalizeParam(value?: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeToken(value?: string | null): string | null {
  const token = normalizeParam(value);
  if (!token) return null;
  if (token.length < 16 || token.length > 128) return null;
  return token;
}

function normalizeItems(value: RawOrder["order_items"]): RawOrderItem[] {
  const source = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? [value]
      : [];

  return source.map((item) => ({
    id: item.id ?? 0,
    title: item.title ?? "",
    size_label: item.size_label ?? "",
    quantity: item.quantity ?? 0,
    unit_price_cents: item.unit_price_cents ?? 0,
    line_total_cents: item.line_total_cents ?? 0,
  }));
}

function normalizeAddress(value: RawOrder["addresses"]): RawAddress | null {
  if (Array.isArray(value)) return value[0] ?? null;
  if (value && typeof value === "object") return value;
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    const orderId =
      normalizeParam(searchParams.get("order_id")) ??
      normalizeParam(searchParams.get("external_reference"));
    const preferenceId = normalizeParam(searchParams.get("preference_id"));
    const token = normalizeToken(
      searchParams.get("token") ?? searchParams.get("order_token")
    );

    if (!token) {
      return NextResponse.json(
        { error: "Token inválido o faltante." },
        { status: 400 }
      );
    }

    if (!orderId && !preferenceId) {
      return NextResponse.json(
        { error: "No se encontró referencia del pedido." },
        { status: 400 }
      );
    }

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supa
      .from("orders")
      .select(
        `
          id,
          external_reference,
          status,
          total_cents,
          currency,
          discount_amount_cents,
          coupon_code,
          created_at,
          shipping_address_id,
          delivery_method,
          preference_id,
          payment_status,
          order_items (
            id,
            title,
            size_label,
            quantity,
            unit_price_cents,
            line_total_cents
          ),
          addresses:shipping_address_id (
            full_name,
            phone,
            line1,
            line2,
            city,
            state,
            zip,
            reference
          )
        `
      )
      .eq("public_access_token", token);

    if (orderId) {
      query = query.eq("id", orderId);
    }

    if (preferenceId) {
      query = query.eq("preference_id", preferenceId);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return NextResponse.json(
        { error: "No se encontró el pedido para este enlace." },
        { status: 404 }
      );
    }

    const order = data as RawOrder;
    const items = normalizeItems(order.order_items);
    const address = normalizeAddress(order.addresses);

    const { data: latestPayment } = await supa
      .from("payments")
      .select("status_detail")
      .eq("order_id", order.id)
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      order: {
        id: order.id,
        external_reference: order.external_reference,
        status: order.status,
        total_cents: order.total_cents,
        currency: order.currency,
        discount_amount_cents: order.discount_amount_cents,
        coupon_code: order.coupon_code,
        created_at: order.created_at,
        shipping_address_id: order.shipping_address_id,
        delivery_method: order.delivery_method ?? undefined,
        preference_id: order.preference_id,
        payment_status: order.payment_status,
        payment_status_detail: latestPayment?.status_detail ?? null,
      },
      items,
      address,
    });
  } catch (error) {
    console.error("[Checkout] Error fetching public order summary:", error);
    return NextResponse.json(
      { error: "Error interno al consultar el pedido." },
      { status: 500 }
    );
  }
}
