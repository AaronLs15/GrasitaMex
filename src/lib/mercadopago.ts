// lib/mercadopago.ts
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

/**
 * Cliente MercadoPago configurado con el access token del entorno
 */
export const mercadoPagoClient = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN!,
});

/**
 * Instancia pre-configurada de Preference para crear preferencias de pago
 */
export const preferenceClient = new Preference(mercadoPagoClient);

/**
 * Instancia pre-configurada de Payment para consultar pagos
 */
export const paymentClient = new Payment(mercadoPagoClient);

/**
 * Convierte centavos a pesos (formato requerido por MercadoPago)
 */
export function centsToPesos(cents: number): number {
    return cents / 100;
}

/**
 * Convierte pesos a centavos (para guardar en la DB)
 */
export function pesosToCents(pesos: number): number {
    return Math.round(pesos * 100);
}

/**
 * Formatea centavos a moneda MXN para mostrar al usuario
 */
export function formatMoney(cents: number): string {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
    }).format(centsToPesos(cents));
}

/**
 * Tipos de estados de orden según el esquema de la DB
 */
export type OrderStatus =
    | 'created'
    | 'pending_payment'
    | 'paid'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'refunded';

/**
 * Tipos de estados de pago de MercadoPago
 */
export type PaymentStatus =
    | 'approved'
    | 'in_process'
    | 'rejected'
    | 'authorized'
    | 'refunded'
    | 'charged_back'
    | 'pending_capture';

/**
 * Mapea estado de pago de MercadoPago a estado de orden
 */
export function mapPaymentStatusToOrderStatus(
    paymentStatus: PaymentStatus
): OrderStatus {
    switch (paymentStatus) {
        case 'approved':
            return 'paid';
        case 'refunded':
            return 'refunded';
        case 'in_process':
        case 'pending_capture':
        case 'authorized':
            return 'pending_payment';
        case 'rejected':
        case 'charged_back':
            return 'created'; // vuelve a carrito/creado
        default:
            return 'pending_payment';
    }
}

/**
 * Genera las URLs de redirección para MercadoPago
 * Nota: Esta función se ejecuta en el servidor, por lo que usa variables sin NEXT_PUBLIC_
 */
export function getBackUrls() {
    // En el servidor no podemos usar NEXT_PUBLIC_, usamos la variable normal
    let baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_LINK_PROYECTO || 'http://localhost:3000';

    // Remover trailing slash si existe
    baseUrl = baseUrl.replace(/\/$/, '');

    return {
        success: `${baseUrl}/checkout/success`,
        failure: `${baseUrl}/checkout/failure`,
        pending: `${baseUrl}/checkout/pending`,
    };
}

/**
 * Genera la URL del webhook
 */
export function getWebhookUrl() {
    let baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_LINK_PROYECTO || 'http://localhost:3000';

    // Remover trailing slash si existe
    baseUrl = baseUrl.replace(/\/$/, '');

    return `${baseUrl}/api/mercadopago/webhook`;
}

