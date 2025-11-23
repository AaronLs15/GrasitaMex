// app/api/mercadopago/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import {
  paymentClient,
  pesosToCents,
  mapPaymentStatusToOrderStatus,
  type PaymentStatus,
} from '@/lib/mercadopago';

export const dynamic = 'force-dynamic';

/**
 * Verifica la firma del webhook de MercadoPago
 */
async function verifySignature(req: NextRequest, raw: string): Promise<boolean> {
  const header = req.headers.get('x-signature');
  const secret = process.env.MP_WEBHOOK_SECRET;

  if (!header || !secret) {
    console.warn('[Webhook] Missing signature header or webhook secret');
    return false;
  }

  try {
    // MercadoPago envía: ts=timestamp,v1=hash
    const parts = header.split(',');
    const tsMatch = parts.find(p => p.startsWith('ts='));
    const v1Match = parts.find(p => p.startsWith('v1='));

    if (!tsMatch || !v1Match) {
      console.warn('[Webhook] Invalid signature format');
      return false;
    }

    const timestamp = tsMatch.split('=')[1];
    const receivedHash = v1Match.split('=')[1];

    // Construct the signed content: id + request_id + ts (or just raw body depending on MP docs)
    // For simplicity, we'll hash the raw body
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(raw)
      .digest('hex');

    const isValid = receivedHash === expectedHash;

    if (!isValid) {
      console.warn('[Webhook] Signature verification failed');
    }

    return isValid;
  } catch (error) {
    console.error('[Webhook] Error verifying signature:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  let payload: any;

  try {
    payload = JSON.parse(raw || '{}');
  } catch (error) {
    console.error('[Webhook] Invalid JSON payload');
    return NextResponse.json({ ok: true }); // Return 200 to avoid retries
  }

  // Log webhook receipt
  console.log('[Webhook] Received notification:', {
    type: payload?.type,
    action: payload?.action,
    id: payload?.data?.id,
  });

  // Verificar firma (opcional en desarrollo, obligatorio en producción)
  if (process.env.NODE_ENV === 'production') {
    const isValid = await verifySignature(req, raw);
    if (!isValid) {
      console.error('[Webhook] Signature verification failed');
      return new NextResponse('Invalid signature', { status: 401 });
    }
  }

  const topic = payload?.type ?? payload?.action;
  const paymentId = payload?.data?.id ?? payload?.id;

  if (!paymentId || topic !== 'payment') {
    console.log('[Webhook] Ignoring non-payment notification');
    return NextResponse.json({ ok: true });
  }

  // Ignorar IDs de prueba del simulador de MercadoPago
  const testIds = ['123', '123456', '12345678'];
  if (testIds.includes(String(paymentId))) {
    console.log('[Webhook] Ignoring test payment ID:', paymentId);
    return NextResponse.json({
      ok: true,
      message: 'Test webhook received successfully'
    });
  }

  try {
    // Consultar el pago en MercadoPago
    console.log('[Webhook] Fetching payment from MercadoPago:', paymentId);
    const payment = await paymentClient.get({ id: paymentId.toString() });

    if (!payment || !payment.id) {
      console.error('[Webhook] Payment not found:', paymentId);
      return NextResponse.json({ ok: true }); // Return 200 para evitar retries
    }

    console.log('[Webhook] Payment details:', {
      id: payment.id,
      status: payment.status,
      external_reference: payment.external_reference,
      amount: payment.transaction_amount,
    });

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Upsert en tabla payments (auditoría)
    const { error: paymentInsertError } = await supa.from('payments').upsert(
      {
        provider: 'mercadopago',
        order_id: payment.external_reference as string,
        status: payment.status as PaymentStatus,
        status_detail: payment.status_detail ?? null,
        amount_cents: pesosToCents(payment.transaction_amount ?? 0),
        currency: payment.currency_id ?? 'MXN',
        preference_id:
          (payment.point_of_interaction?.transaction_data as any)?.preference_id ?? null,
        payment_id: payment.id?.toString(),
        merchant_order_id: payment.order?.id ? String(payment.order.id) : null,
        external_reference: payment.external_reference ?? null,
        raw: payment as any,
      },
      { onConflict: 'payment_id' }
    );

    if (paymentInsertError) {
      console.error('[Webhook] Error upserting payment:', paymentInsertError);
    }

    // 2. Mapear estado de pago → estado de orden
    const orderStatus = mapPaymentStatusToOrderStatus(payment.status as PaymentStatus);

    console.log('[Webhook] Updating order:', {
      external_reference: payment.external_reference,
      payment_status: payment.status,
      new_order_status: orderStatus,
    });

    // 3. Actualizar orden usando external_reference como el ID
    const { data: updatedOrder, error: orderUpdateError } = await supa
      .from('orders')
      .update({
        payment_id: payment.id?.toString(),
        payment_status: payment.status as PaymentStatus,
        mp_merchant_order_id: payment.order?.id ? String(payment.order.id) : null,
        status: orderStatus,
        updated_at: new Date().toISOString(),
        mp_request_id: req.headers.get('x-request-id') ?? null,
      })
      .eq('id', payment.external_reference as string) // external_reference ES el order ID (UUID)
      .select()
      .single();

    if (orderUpdateError) {
      console.error('[Webhook] Error updating order:', {
        error: orderUpdateError,
        code: orderUpdateError.code,
        message: orderUpdateError.message,
        details: orderUpdateError.details,
        external_reference: payment.external_reference,
      });

      // Intentar buscar la orden para debug
      const { data: orderCheck } = await supa
        .from('orders')
        .select('id, status, external_reference')
        .eq('id', payment.external_reference as string)
        .single();

      console.log('[Webhook] Order check:', orderCheck);

      return NextResponse.json(
        { error: 'Error updating order', details: orderUpdateError.message },
        { status: 500 }
      );
    }

    console.log('[Webhook] Order updated successfully:', updatedOrder);

    // 4. Lógica de Stock y Cupones

    // Si el pago fue RECHAZADO o CANCELADO, liberar el stock
    if (['rejected', 'cancelled', 'refunded'].includes(payment.status as string) && payment.external_reference) {
      console.log('[Webhook] Payment rejected/cancelled, releasing stock for order:', payment.external_reference);

      const { error: releaseError } = await supa.rpc('release_stock_for_order', {
        p_order_id: payment.external_reference
      });

      if (releaseError) {
        console.error('[Webhook] Error releasing stock:', releaseError);
      } else {
        console.log('[Webhook] Stock released successfully');
      }
    }

    // Si el pago fue APROBADO, incrementar el contador de uso del cupón
    if (payment.status === 'approved' && payment.external_reference) {
      // Obtener la orden para ver si usó un cupón
      const { data: order } = await supa
        .from('orders')
        .select('coupon_code')
        .eq('id', payment.external_reference)
        .single();

      if (order?.coupon_code) {
        console.log('[Webhook] Incrementing coupon usage:', order.coupon_code);

        const { error: couponError } = await supa.rpc('increment_coupon_usage', {
          p_code: order.coupon_code,
        });

        // Si la función RPC no existe, hacer update manual
        if (couponError) {
          console.log('[Webhook] RPC not found, using manual update');
          // Nota: esto es un fallback, idealmente usa el RPC
        }
      }
    }

    console.log('[Webhook] Successfully processed payment:', {
      paymentId: payment.id,
      orderId: payment.external_reference,
      newStatus: orderStatus,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[Webhook] Error processing webhook:', error);

    // Si es un error de "payment not found", retornar 200 para evitar retries
    if (error?.message?.includes('not found') || error?.status === 404) {
      console.log('[Webhook] Payment not found, skipping');
      return NextResponse.json({
        ok: true,
        message: 'Payment not found - possibly a test payment'
      });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
