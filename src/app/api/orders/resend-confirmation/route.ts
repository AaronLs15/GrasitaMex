import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sendOrderConfirmationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

type ResendRequestBody = {
  order_id?: string;
  orderId?: string;
};

async function getSessionUserId() {
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
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  return user?.id ?? null;
}

export async function POST(req: NextRequest) {
  let body: ResendRequestBody | null = null;

  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const searchParams = req.nextUrl.searchParams;
  const orderId =
    body?.order_id ||
    body?.orderId ||
    searchParams.get('order_id') ||
    searchParams.get('orderId') ||
    '';

  if (!orderId) {
    return NextResponse.json(
      { error: 'Falta order_id' },
      { status: 400 }
    );
  }

  try {
    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: order, error } = await supa
      .from('orders')
      .select('*, profiles:user_id(email, display_name), order_items(*)')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    const headerSecret = req.headers.get('x-resend-secret');
    const envSecret = process.env.RESEND_EMAIL_SECRET;
    const sessionUserId = await getSessionUserId();
    const isAuthorized =
      (envSecret && headerSecret === envSecret) ||
      (!!sessionUserId && sessionUserId === order.user_id);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    if (!order.profiles?.email) {
      return NextResponse.json(
        { error: 'La orden no tiene email asociado' },
        { status: 400 }
      );
    }

    await sendOrderConfirmationEmail(order, order.order_items || []);

    return NextResponse.json({
      success: true,
      order_id: order.id,
      email: order.profiles.email,
    });
  } catch (error: any) {
    console.error('Error resending confirmation email:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
