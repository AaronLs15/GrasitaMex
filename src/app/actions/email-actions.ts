'use server'

import { createClient } from '@supabase/supabase-js';
import { sendOrderPickupReadyEmail, sendOrderShippedEmail, sendOrderStatusEmail } from '@/lib/email';

const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function notifyOrderStatus(
    orderId: string,
    status: string,
    meta?: { trackingNumber?: string; sender?: 'Estafeta' | 'DHL' | 'Fedex' }
) {
    try {
        const { data: order, error } = await supa
            .from('orders')
            .select('delivery_method, external_reference, id, total_cents, created_at, shipping_address_id, profiles:user_id(email, display_name)')
            .eq('id', orderId)
            .single();

        if (error || !order) throw new Error('Order not found');

        const normalizedOrder = {
            ...order,
            profiles: Array.isArray(order.profiles) ? order.profiles[0] : order.profiles,
        };

        if (status === 'shipped') {
            if (order.delivery_method === 'pickup') {
                await sendOrderPickupReadyEmail(normalizedOrder as any);
            } else {
                await sendOrderShippedEmail(normalizedOrder as any, meta?.trackingNumber, meta?.sender);
            }
        } else {
            await sendOrderStatusEmail(normalizedOrder as any, status);
        }
        return { success: true };
    } catch (error: any) {
        console.error('Error sending status email:', error);
        return { success: false, error: error.message };
    }
}
