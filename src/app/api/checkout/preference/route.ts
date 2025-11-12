// app/api/checkout/preference/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const { orderId } = await req.json(); // UUID del pedido en tu DB
  const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Trae items snapshot del pedido
  const { data: items } = await supa
    .from('order_items')
    .select('title, unit_price_cents, quantity')
    .eq('order_id', orderId);

  const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
  const pref = new Preference(mp);

  const body = {
    items: (items ?? []).map((i, idx) => ({
      id: `${String(orderId)}-${idx}`,
      title: i.title,
      quantity: i.quantity,
      currency_id: 'MXN',
      unit_price: i.unit_price_cents / 100
    })),
    external_reference: String(orderId),
    back_urls: {
      success: `${process.env.PUBLIC_BASE_URL}/checkout/success`,
      failure: `${process.env.PUBLIC_BASE_URL}/checkout/failure`,
      pending: `${process.env.PUBLIC_BASE_URL}/checkout/pending`,
    },
    auto_return: 'approved',
    notification_url: `${process.env.PUBLIC_BASE_URL}/api/mercadopago/webhook`,
  };

  const { id: preference_id, init_point } = await pref.create({ body })
    .then(r => ({ id: r.id, init_point: r.init_point! }));

  // Actualiza el pedido: preference creada → 'pending_payment'
  await supa.from('orders')
    .update({ preference_id, status: 'pending_payment' })
    .eq('id', orderId);

  return NextResponse.json({ preference_id, init_point });
}
