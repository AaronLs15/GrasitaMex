// app/api/mercadopago/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function verifySignature(req: NextRequest, raw: string) {
  // MP envía x-signature; el algoritmo puede variar (HMAC-SHA256 con tu "Webhook secret").
  // Según la doc, compara la firma del payload y/o cadena canónica.
  // Implementación exacta depende de cómo MP construye signatureString en tu país/versión.
  // Si tu infraestructura altera headers (ej. proxies), valida por payload contra tu secret.
  const header = req.headers.get('x-signature');
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!header || !secret) return false;

  const [, algorithmPart] = header.split(',');
  const algo = (algorithmPart?.split('=')[1] || 'HMAC-SHA256').replace('HMAC-','sha').toLowerCase();
  const expected = crypto.createHmac(algo, secret).update(raw).digest('hex');
  return header.includes(expected);
}

export async function POST(req: NextRequest) {
  const raw = await req.text(); // RAW BODY
  let payload: any;
  try { payload = JSON.parse(raw || '{}'); } catch { return NextResponse.json({ ok: true }); }

  // (Opcional) Verifica firma. Si falla, devuelve 401.
  try {
    const ok = await verifySignature(req, raw);
    if (!ok) {
      // Puedes desactivar esta verificación mientras desarrollas con ngrok.
      // return new NextResponse('invalid signature', { status: 401 });
    }
  } catch {}

  const topic = payload?.type ?? payload?.action; // "payment" en general
  const paymentId = payload?.data?.id ?? payload?.id;

  if (!paymentId || topic !== 'payment') return NextResponse.json({ ok: true });

  // Consulta el pago
  const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
  const payment = new Payment(mp);
  const p = await payment.get({ id: paymentId.toString() }); // incluye status, status_detail, external_reference, transaction_amount, currency_id...

  const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Upsert en payments (auditoría)
  await supa.from('payments').upsert({
    provider: 'mercadopago',
    order_id: p.external_reference as string,
    status: p.status,                // 'approved' | 'in_process' | 'rejected' | ...
    status_detail: p.status_detail,  // motivo
    amount_cents: Math.round((p.transaction_amount ?? 0) * 100),
    currency: p.currency_id ?? 'MXN',
    preference_id: (p.point_of_interaction?.transaction_data as any)?.preference_id ?? null,
    payment_id: p.id?.toString(),
    merchant_order_id: p.order?.id ? String(p.order.id) : null,
    external_reference: p.external_reference ?? null,
    raw: p as any,
  }, { onConflict: 'payment_id' });

  // Mapea estado de pago → estado de pedido
  let orderStatus: 'paid' | 'pending_payment' | 'cancelled' | 'refunded' | 'created' = 'pending_payment';
  switch (p.status) {
    case 'approved': orderStatus = 'paid'; break;
    case 'refunded': orderStatus = 'refunded'; break;
    case 'in_process': orderStatus = 'pending_payment'; break;
    case 'rejected': orderStatus = 'created'; break; // vuelve a carrito/creado
    default: orderStatus = 'pending_payment';
  }

  await supa.from('orders')
    .update({
      payment_id: p.id?.toString(),
      payment_status: p.status,
      mp_merchant_order_id: p.order?.id ? String(p.order.id) : null,
      status: orderStatus,
      updated_at: new Date().toISOString(),
      mp_request_id: req.headers.get('x-request-id') ?? null  // si el header está presente
    })
    .eq('id', p.external_reference);

  return NextResponse.json({ ok: true });
}
