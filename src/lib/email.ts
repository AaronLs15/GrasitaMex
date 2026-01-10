import nodemailer from 'nodemailer';
import { formatMoney } from './mercadopago';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Create a transporter using SMTP settings from environment variables
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpSecure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : smtpPort === 465;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpSecure, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

type OrderLineItem = {
    title?: string;
    name?: string;
    quantity?: number;
    line_total_cents?: number;
    line_total?: number;
    unit_price_cents?: number;
    price_cents?: number;
    price?: number;
};

export type Order = {
    id: string;
    external_reference?: string;
    total_cents: number;
    shipping_cost_cents?: number;
    discount_amount_cents?: number;
    shipping_address_id?: number | null;
    delivery_method?: 'shipment' | 'pickup';
    addresses?: {
        full_name?: string;
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        zip?: string;
    } | null;
    profiles?: {
        display_name?: string;
        email: string;
    };
    created_at: string;
    // Add other fields as needed
};

// Helper to format currency
function fMoney(cents: number) {
    return formatMoney(cents);
}

// Basic email layout wrapper
function wrapHtml(content: string) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #D62828; }
            .btn { display: inline-block; padding: 10px 20px; background-color: #D62828; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { margin-top: 40px; font-size: 12px; color: #888; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { text-align: left; padding: 10px; border-bottom: 1px solid #ddd; }
            th { background-color: #f8f8f8; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">GrasitaMex</div>
            </div>
            ${content}
            <div class="footer">
                <p>Gracias por tu preferencia.</p>
                <p>GrasitaMex - Ventas</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

const PICKUP_ADDRESS_LINES = [
    'Calle Plazoleta B 156',
    'Colonia San Andres',
    'CP 44730, Guadalajara, Jalisco.',
];

function getPickupHtml() {
    return `
        <p><strong>Pick up:</strong> Pasa a esta direccion para recoger tu par:</p>
        <p>${PICKUP_ADDRESS_LINES.join('<br />')}</p>
        <p>Presenta tu # de orden o el correo de confirmacion del pedido.</p>
    `;
}

export async function testemail(to: string) {
    const html = wrapHtml(`
        <h2>¡Gracias por tu compra, 'Cliente'}!</h2>
        <p>Hemos recibido tu pedido correctamente. Aquí están los detalles:</p>
        
        <p><strong>Pedido:</strong> #01</p>
        <p><strong>Fecha:</strong> ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
        
        <table>
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ola
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2" style="text-align:right"><strong>Total:</strong></td>
                    <td><strong>$100</strong></td>
                </tr>
            </tfoot>
        </table>
        
        <p>Estamos procesando tu orden y te notificaremos cuando sea enviada.</p>
    `);

    await transporter.sendMail({
        from: `"GrasitaMex Ventas" <${process.env.SMTP_USER}>`,
        to,
        subject: `Confirmación de pedido - GrasitaMex`,
        html,
    });
}

export async function sendOrderConfirmationEmail(order: Order, items: OrderLineItem[]) {
    if (!order.profiles?.email) return;

    const orderId = order.external_reference || order.id.slice(0, 8);
    const isPickup = order.delivery_method
        ? order.delivery_method === 'pickup'
        : !order.shipping_address_id;

    const toNumber = (value: unknown) => {
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
    };

    const getItemLineTotalCents = (item: OrderLineItem) => {
        if (item?.line_total_cents != null) return toNumber(item.line_total_cents);
        if (item?.line_total != null) return toNumber(item.line_total);

        const unitPrice =
            item?.unit_price_cents ??
            item?.price_cents ??
            item?.price;

        return toNumber(unitPrice) * toNumber(item?.quantity ?? 0);
    };

    // Build items table rows
    const itemsHtml = items.map(item => `
        <tr>
            <td>${item.title ?? item.name ?? 'Producto'}</td>
            <td>${toNumber(item.quantity || 1)}</td>
            <td>${fMoney(getItemLineTotalCents(item))}</td>
        </tr>
    `).join('');

    const itemsSubtotalCents = items.reduce(
        (sum, item) => sum + getItemLineTotalCents(item),
        0
    );
    const discountCents = toNumber(order.discount_amount_cents);
    const orderTotalCents = toNumber(order.total_cents);

    let shippingCostCents = toNumber(order.shipping_cost_cents);
    if (!shippingCostCents && orderTotalCents > 0) {
        const computedShipping = orderTotalCents + discountCents - itemsSubtotalCents;
        if (computedShipping > 0) {
            shippingCostCents = computedShipping;
        }
    }

    const shippingRow = shippingCostCents > 0
        ? `
                <tr>
                    <td colspan="2" style="text-align:right"><strong>Envío:</strong></td>
                    <td><strong>${fMoney(shippingCostCents)}</strong></td>
                </tr>
        `
        : '';

    const pickupNote = isPickup ? getPickupHtml() : '';

    const html = wrapHtml(`
        <h2>¡Gracias por tu compra, ${order.profiles.display_name || 'Cliente'}!</h2>
        <p>Hemos recibido tu pedido correctamente. Aquí están los detalles:</p>
        
        <p><strong>Pedido:</strong> #${orderId}</p>
        <p><strong>Fecha:</strong> ${format(new Date(order.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
        ${pickupNote}
        
        <table>
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
            <tfoot>
                ${shippingRow}
                <tr>
                    <td colspan="2" style="text-align:right"><strong>Total:</strong></td>
                    <td><strong>${fMoney(orderTotalCents)}</strong></td>
                </tr>
            </tfoot>
        </table>
        <p>
            ${isPickup
                ? 'Te avisaremos cuando tu pedido este listo para recoger.'
                : 'Estamos procesando tu orden y te notificaremos cuando sea enviada.'}
        </p>
    `);

    await transporter.sendMail({
        from: `"GrasitaMex Ventas" <${process.env.SMTP_USER}>`,
        to: order.profiles.email,
        subject: `${isPickup ? 'Confirmacion de pedido (Pick up)' : 'Confirmacion de pedido'} #${orderId} - GrasitaMex`,
        html,
    });
}

export async function sendOrderNotificationEmail(order: Order, items: OrderLineItem[]) {
    const salesEmail = 'Joshuaguz04@gmail.com';
    const orderId = order.external_reference || order.id.slice(0, 8);
    const isPickup = order.delivery_method
        ? order.delivery_method === 'pickup'
        : !order.shipping_address_id;

    const toNumber = (value: unknown) => {
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
    };

    const getItemLineTotalCents = (item: OrderLineItem) => {
        if (item?.line_total_cents != null) return toNumber(item.line_total_cents);
        if (item?.line_total != null) return toNumber(item.line_total);

        const unitPrice =
            item?.unit_price_cents ??
            item?.price_cents ??
            item?.price;

        return toNumber(unitPrice) * toNumber(item?.quantity ?? 0);
    };

    const itemsHtml = items.map(item => `
        <tr>
            <td>${item.title ?? item.name ?? 'Producto'}</td>
            <td>${toNumber(item.quantity || 1)}</td>
            <td>${fMoney(getItemLineTotalCents(item))}</td>
        </tr>
    `).join('');

    const itemsSubtotalCents = items.reduce(
        (sum, item) => sum + getItemLineTotalCents(item),
        0
    );
    const discountCents = toNumber(order.discount_amount_cents);
    const orderTotalCents = toNumber(order.total_cents);

    let shippingCostCents = toNumber(order.shipping_cost_cents);
    if (!shippingCostCents && orderTotalCents > 0) {
        const computedShipping = orderTotalCents + discountCents - itemsSubtotalCents;
        if (computedShipping > 0) {
            shippingCostCents = computedShipping;
        }
    }

    const shippingRow = shippingCostCents > 0
        ? `
                <tr>
                    <td colspan="2" style="text-align:right"><strong>Envío:</strong></td>
                    <td><strong>${fMoney(shippingCostCents)}</strong></td>
                </tr>
        `
        : '';

    const deliveryHtml = isPickup
        ? getPickupHtml()
        : `
        <p><strong>Envio a:</strong></p>
        <p>${order?.addresses?.full_name || 'Sin nombre'}</p>
        <p>${order?.addresses?.line1 || ''}</p>
        ${order?.addresses?.line2 ? `<p>${order.addresses.line2}</p>` : ''}
        <p>${order?.addresses?.city || ''}, ${order?.addresses?.state || ''} ${order?.addresses?.zip || ''}</p>
        `;

    const html = wrapHtml(`
        <h2>Nuevo pedido recibido</h2>
        <p><strong>Pedido:</strong> #${orderId}</p>
        <p><strong>Fecha:</strong> ${format(new Date(order.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
        <p><strong>Cliente:</strong> ${order.profiles?.display_name || 'Cliente'}</p>
        <p><strong>Email:</strong> ${order.profiles?.email || '-'}</p>
        ${deliveryHtml}

        <table>
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
            <tfoot>
                ${shippingRow}
                <tr>
                    <td colspan="2" style="text-align:right"><strong>Total:</strong></td>
                    <td><strong>${fMoney(orderTotalCents)}</strong></td>
                </tr>
            </tfoot>
        </table>
    `);

    await transporter.sendMail({
        from: `"GrasitaMex Ventas" <${process.env.SMTP_USER}>`,
        to: salesEmail,
        subject: `Nuevo pedido #${orderId} - GrasitaMex`,
        html,
    });
}

export async function sendOrderStatusEmail(order: Order, status: string) {
    if (!order.profiles?.email) return;

    const orderId = order.external_reference || order.id.slice(0, 8);
    const displayName = order.profiles.display_name || 'Cliente';

    const statusCopy: Record<string, { title: string; body: string }> = {
        processing: {
            title: 'Tu pedido está en preparación',
            body: 'Estamos preparando tu pedido. Te avisaremos cuando esté listo para enviar o recoger.',
        },
        shipped: {
            title: 'Tu pedido ha sido enviado',
            body: 'Tu pedido ya salió. Pronto recibirás tu producto.',
        },
        delivered: {
            title: 'Tu pedido ha sido entregado',
            body: 'Gracias por tu compra. ¡Esperamos que disfrutes tu par!',
        },
        cancelled: {
            title: 'Tu pedido fue cancelado',
            body: 'Si tienes dudas, contáctanos y con gusto te ayudamos.',
        },
    };

    const copy = statusCopy[status];
    if (!copy) return;

    const html = wrapHtml(`
        <h2>${copy.title}</h2>
        <p>Hola ${displayName},</p>
        <p>Pedido <strong>#${orderId}</strong>.</p>
        <p>${copy.body}</p>
    `);

    await transporter.sendMail({
        from: `"GrasitaMex Ventas" <${process.env.SMTP_USER}>`,
        to: order.profiles.email,
        subject: `${copy.title} #${orderId} - GrasitaMex`,
        html,
    });
}

export async function sendOrderPickupReadyEmail(order: Order) {
    if (!order.profiles?.email) return;

    const orderId = order.external_reference || order.id.slice(0, 8);
    const html = wrapHtml(`
        <h2>Tu pedido está listo para pick up</h2>
        <p>Hola ${order.profiles.display_name || 'Cliente'},</p>
        <p>Tu pedido <strong>#${orderId}</strong> ya está listo para que lo recojas.</p>
        ${getPickupHtml()}
    `);

    await transporter.sendMail({
        from: `"GrasitaMex Ventas" <${process.env.SMTP_USER}>`,
        to: order.profiles.email,
        subject: `Pick up listo #${orderId} - GrasitaMex`,
        html,
    });
}

export async function sendOrderShippedEmail(order: Order, trackingNumber?: string, sender?:string) {
    if (!order.profiles?.email) return;

    const orderId = order.external_reference || order.id.slice(0, 8);

    const html = wrapHtml(`
        <h2>¡Tu pedido ha sido enviado! 🚚</h2>
        <p>Hola ${order.profiles.display_name || 'Cliente'},</p>
        <p>Nos complace informarte que tu pedido <strong>#${orderId}</strong> ya está en camino.</p>
        
        ${trackingNumber ? `<p>Número de rastreo: <strong>${trackingNumber}</strong></p>` : ''}
        ${sender ? `<p>Paqueteria: <strong>${sender}</strong></p>` : ''}
        
        <p>Pronto recibirás tus productos.</p>
    `);

    await transporter.sendMail({
        from: `"GrasitaMex Ventas" <${process.env.SMTP_USER}>`,
        to: order.profiles.email,
        subject: `Tu pedido #${orderId} ha sido enviado - GrasitaMex`,
        html,
    });
}

export async function sendOrderDeliveredEmail(order: Order) {
    if (!order.profiles?.email) return;

    const orderId = order.external_reference || order.id.slice(0, 8);

    const html = wrapHtml(`
        <h2>¡Pedido Entregado! 🎉</h2>
        <p>Hola ${order.profiles.display_name || 'Cliente'},</p>
        <p>Tu pedido <strong>#${orderId}</strong> ha sido marcado como entregado.</p>
        <p>Esperamos que disfrutes tu compra. ¡Gracias por confiar en GrasitaMex!</p>
        
        <center>
             <a href="${process.env.NEXT_PUBLIC_LINK_PROYECTO || 'http://localhost:3000'}" class="btn">Volver a la tienda</a>
        </center>
    `);

    await transporter.sendMail({
        from: `"GrasitaMex Ventas" <${process.env.SMTP_USER}>`,
        to: order.profiles.email,
        subject: `Tu pedido #${orderId} ha sido entregado - GrasitaMex`,
        html,
    });
}
