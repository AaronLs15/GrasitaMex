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
            .select('delivery_method, external_reference, id, profiles:user_id(email, display_name)')
            .eq('id', orderId)
            .single();

        if (error || !order) throw new Error('Order not found');

        if (status === 'shipped') {
            if (order.delivery_method === 'pickup') {
                await sendOrderPickupReadyEmail(order);
            } else {
                await sendOrderShippedEmail(order, meta?.trackingNumber, meta?.sender);
            }
        } else {
            await sendOrderStatusEmail(order, status);
        }
        return { success: true };
    } catch (error: any) {
        console.error('Error sending status email:', error);
        return { success: false, error: error.message };
    }
}
