import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type PosSaleRequest = {
  variant_id?: number;
  quantity?: number;
  unit_price_cents?: number;
  customer_name?: string | null;
  customer_email?: string | null;
  note?: string | null;
};

type RpcError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function toPositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const integer = Math.trunc(parsed);
  if (integer <= 0) return null;
  return integer;
}

function toNonNegativeInt(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const integer = Math.trunc(parsed);
  if (integer < 0) return null;
  return integer;
}

function normalizeText(value: unknown, maxLen = 255): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLen);
}

function normalizeEmail(value: unknown): string | null {
  const normalized = normalizeText(value, 320)?.toLowerCase() ?? null;
  if (!normalized) return null;
  return EMAIL_REGEX.test(normalized) ? normalized : null;
}

function isPosFunctionMissing(error: RpcError | null): boolean {
  const message = error?.message ?? "";
  return message.includes("Could not find the function public.create_pos_order_with_stock");
}

async function getAdminUserId(): Promise<{ userId: string | null; error: NextResponse | null }> {
  const cookieStore = await cookies();

  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return {
      userId: null,
      error: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabaseAuth
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return {
      userId: null,
      error: NextResponse.json({ error: "Solo admins pueden registrar ventas físicas" }, { status: 403 }),
    };
  }

  return { userId: user.id, error: null };
}

export async function POST(req: NextRequest) {
  let body: PosSaleRequest;
  try {
    body = (await req.json()) as PosSaleRequest;
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const variantId = toPositiveInt(body.variant_id);
  const quantity = toPositiveInt(body.quantity ?? 1);
  const unitPriceCents = toNonNegativeInt(body.unit_price_cents);
  const customerName = normalizeText(body.customer_name, 160);
  const customerEmailRaw = normalizeText(body.customer_email, 320);
  const customerEmail = customerEmailRaw ? normalizeEmail(customerEmailRaw) : null;
  const note = normalizeText(body.note, 400);

  if (!variantId) {
    return NextResponse.json({ error: "variant_id inválido" }, { status: 400 });
  }
  if (!quantity) {
    return NextResponse.json({ error: "quantity inválido" }, { status: 400 });
  }
  if (unitPriceCents === null) {
    return NextResponse.json({ error: "unit_price_cents inválido" }, { status: 400 });
  }
  if (customerEmailRaw && !customerEmail) {
    return NextResponse.json({ error: "customer_email inválido" }, { status: 400 });
  }

  const { userId: adminUserId, error: authError } = await getAdminUserId();
  if (authError || !adminUserId) {
    return authError ?? NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: orderId, error } = await supa.rpc("create_pos_order_with_stock", {
    p_admin_user_id: adminUserId,
    p_variant_id: variantId,
    p_quantity: quantity,
    p_unit_price_cents: unitPriceCents,
    p_customer_name: customerName,
    p_customer_email: customerEmail,
    p_note: note,
  });

  if (error || !orderId) {
    if (isPosFunctionMissing(error)) {
      return NextResponse.json(
        {
          error:
            "Tu base de datos aún no está actualizada para POS. Ejecuta la migración 005_pos_sales.sql.",
        },
        { status: 500 }
      );
    }

    const message = error?.message || "No se pudo registrar la venta física";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    order_id: orderId,
  });
}
