'use server'

import { createClient } from '@supabase/supabase-js';
import { sendOrderPickupReadyEmail, sendOrderShippedEmail, sendOrderStatusEmail, type Order } from '@/lib/email';

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
            .select('delivery_method, external_reference, id, total_cents, created_at, shipping_address_id, guest_email, profiles:user_id(email, display_name), addresses:shipping_address_id(full_name)')
            .eq('id', orderId)
            .single();

        if (error || !order) throw new Error('Order not found');

        const rawProfile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
        const normalizedProfiles = rawProfile && typeof rawProfile.email === 'string'
            ? { email: rawProfile.email, display_name: rawProfile.display_name }
            : undefined;
        const rawAddress = Array.isArray(order.addresses) ? order.addresses[0] : order.addresses;
        const normalizedAddress = rawAddress && typeof rawAddress.full_name === 'string'
            ? { full_name: rawAddress.full_name }
            : undefined;

        const normalizedOrder: Order = {
            id: order.id,
            external_reference: order.external_reference,
            total_cents: order.total_cents ?? 0,
            created_at: order.created_at,
            shipping_address_id: order.shipping_address_id ?? undefined,
            delivery_method: order.delivery_method,
            guest_email: order.guest_email ?? null,
            profiles: normalizedProfiles,
            addresses: normalizedAddress,
        };

        if (status === 'shipped') {
            if (order.delivery_method === 'pickup') {
                await sendOrderPickupReadyEmail(normalizedOrder);
            } else {
                await sendOrderShippedEmail(normalizedOrder, meta?.trackingNumber, meta?.sender);
            }
        } else {
            await sendOrderStatusEmail(normalizedOrder, status);
        }
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error sending status email:', error);
        return { success: false, error: message };
    }
}
