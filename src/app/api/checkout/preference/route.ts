// app/api/checkout/preference/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  preferenceClient,
  centsToPesos,
  getBackUrls,
  getWebhookUrl,
} from '@/lib/mercadopago';

export const dynamic = 'force-dynamic';

interface CartItem {
  id: number;
  product_id: number;
  variant_id: number;
  sku: string;
  title: string;
  size: string;
  price_cents: number;
  quantity: number;
}

interface ShippingAddress {
  id?: number;  // Optional - exists if it's a saved address
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  reference?: string;
  country?: string;
}

interface CreatePreferenceRequest {
  items: CartItem[];
  shipping_address?: ShippingAddress | null;
  delivery_method?: "shipping" | "pickup";
  billing_address?: ShippingAddress;
  coupon_code?: string;
  user_id?: string | null;
  guest_email?: string | null;
}

interface VariantLookupRow {
  id: number;
  product_id: number;
  size_label: string | null;
  sku: string | null;
}

type RpcError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function normalizeEmail(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase() ?? '';
  if (!normalized) return null;
  return EMAIL_REGEX.test(normalized) ? normalized : null;
}

function isCreateOrderFunctionMissing(error: RpcError | null): boolean {
  const message = error?.message ?? '';
  return message.includes('Could not find the function public.create_order_with_stock');
}

function isUserIdNotNullViolation(error: RpcError | null): boolean {
  const message = error?.message ?? '';
  const details = error?.details ?? '';
  return (
    message.includes('null value in column "user_id"') ||
    details.includes('null value in column "user_id"')
  );
}

function isPublicAccessTokenColumnMissing(error: RpcError | null): boolean {
  const message = error?.message ?? '';
  const details = error?.details ?? '';
  return (
    message.includes('public_access_token') ||
    details.includes('public_access_token')
  );
}

function withPublicAccessParams(
  baseUrl: string,
  orderId: string,
  token: string
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('order_id', orderId);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function POST(req: NextRequest) {
  try {
    const body: CreatePreferenceRequest = await req.json();
    const {
      items,
      shipping_address,
      delivery_method,
      coupon_code,
      user_id,
      guest_email,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No hay items en el carrito' },
        { status: 400 }
      );
    }

    const normalizedUserId =
      typeof user_id === 'string' && user_id.trim().length > 0
        ? user_id.trim()
        : null;
    const normalizedGuestEmail = normalizeEmail(guest_email);

    let authenticatedEmail: string | null = null;

    // Security check only for authenticated checkout.
    if (normalizedUserId) {
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

      if (!user || user.id !== normalizedUserId) {
        return NextResponse.json(
          { error: 'Unauthorized: User ID mismatch' },
          { status: 403 }
        );
      }

      authenticatedEmail = normalizeEmail(user.email) ?? null;
    } else if (!normalizedGuestEmail) {
      return NextResponse.json(
        { error: 'Correo de contacto inválido o faltante' },
        { status: 400 }
      );
    }

    const checkoutEmail = authenticatedEmail ?? normalizedGuestEmail;

    if (!checkoutEmail) {
      return NextResponse.json(
        { error: 'No fue posible obtener un correo válido para el pedido' },
        { status: 400 }
      );
    }

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Calcular subtotal
    const subtotal = items.reduce(
      (sum, item) => sum + item.price_cents * item.quantity,
      0
    );

    // 2. Calcular envio (pickup gratis, envio fijo $150 MXN)
    const shippingCost = delivery_method === "pickup" ? 0 : 15000;

    // 3. Validar y aplicar cupón si existe
    let discountAmount = 0;
    let appliedCoupon = null;

    if (coupon_code) {
      const { data: coupon, error: couponError } = await supa
        .from('coupons')
        .select('*')
        .eq('code', coupon_code.toUpperCase())
        .eq('active', true)
        .single();

      if (!couponError && coupon) {
        // Validar vigencia
        const now = new Date();
        const isValid =
          (!coupon.start_date || new Date(coupon.start_date) <= now) &&
          (!coupon.end_date || new Date(coupon.end_date) >= now) &&
          (!coupon.usage_limit || coupon.used_count < coupon.usage_limit) &&
          subtotal >= (coupon.min_purchase_cents || 0);

        if (isValid) {
          // Calcular descuento
          if (coupon.discount_type === 'percentage') {
            discountAmount = Math.round((subtotal * coupon.discount_value) / 100);
            if (coupon.max_discount_cents) {
              discountAmount = Math.min(discountAmount, coupon.max_discount_cents);
            }
          } else {
            // fixed_amount
            discountAmount = coupon.discount_value * 100;
          }

          // No puede ser mayor al subtotal
          discountAmount = Math.min(discountAmount, subtotal);
          appliedCoupon = coupon;
        }
      }
    }

    // 4. Calcular total
    const total = Math.max(0, subtotal + shippingCost - discountAmount);

    // 5. Guardar dirección de envío SOLO si es nueva y el usuario quiere guardarla
    let shippingAddrId: number | null = null;

    const pickupAddress: ShippingAddress = {
      full_name: "Pickup",
      phone: "3311840501",
      line1: "Calle Plazoleta B 156",
      line2: "Colonia San Andres",
      city: "Guadalajara",
      state: "Jalisco",
      zip: "44730",
      country: "MX",
      reference: "Mostrar # de orden o correo de confirmacion",
    };

    const effectiveShippingAddress =
      delivery_method === "pickup" ? pickupAddress : shipping_address;

    if (delivery_method !== "pickup") {
      if (!effectiveShippingAddress) {
        return NextResponse.json(
          { error: "Dirección de envío requerida" },
          { status: 400 }
        );
      }

      if (effectiveShippingAddress.id) {
        // Dirección existente - usar el ID sin crear nueva
        shippingAddrId = effectiveShippingAddress.id;
      } else {
        // Nueva dirección - crear en DB
        const { data: shippingAddr, error: shippingError } = await supa
          .from('addresses')
          .insert({
            user_id: normalizedUserId,
            ...effectiveShippingAddress,
            country: effectiveShippingAddress.country || 'MX',
          })
          .select()
          .single();

        if (shippingError) {
          console.error('Error creating shipping address:', shippingError);
          return NextResponse.json(
            { error: 'Error al guardar la dirección de envío' },
            { status: 500 }
          );
        }

        shippingAddrId = shippingAddr.id;
      }
    }

    // 5.5 Validar y corregir variant_ids si vienen en 0
    // Resolución por lote para evitar N queries por item.
    const itemsMissingVariant = items.filter(
      (item) => !item.variant_id || item.variant_id === 0
    );
    let fixedItems = items;

    if (itemsMissingVariant.length > 0) {
      const productIds = Array.from(
        new Set(
          itemsMissingVariant
            .map((item) => item.product_id)
            .filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
        )
      );

      const skus = Array.from(
        new Set(
          itemsMissingVariant
            .map((item) => item.sku?.trim())
            .filter((sku): sku is string => Boolean(sku))
        )
      );

      const [variantsByProductResult, variantsBySkuResult] = await Promise.all([
        productIds.length > 0
          ? supa
            .from('product_variants')
            .select('id, product_id, size_label, sku')
            .in('product_id', productIds)
          : Promise.resolve({ data: [] as VariantLookupRow[], error: null }),
        skus.length > 0
          ? supa
            .from('product_variants')
            .select('id, product_id, size_label, sku')
            .in('sku', skus)
          : Promise.resolve({ data: [] as VariantLookupRow[], error: null }),
      ]);

      if (variantsByProductResult.error) {
        console.error('[Checkout] Error fetching variants by product:', variantsByProductResult.error);
      }
      if (variantsBySkuResult.error) {
        console.error('[Checkout] Error fetching variants by sku:', variantsBySkuResult.error);
      }

      const variantsById = new Map<number, VariantLookupRow>();
      for (const variant of (variantsByProductResult.data ?? []) as VariantLookupRow[]) {
        variantsById.set(variant.id, variant);
      }
      for (const variant of (variantsBySkuResult.data ?? []) as VariantLookupRow[]) {
        variantsById.set(variant.id, variant);
      }

      const variantByProductSize = new Map<string, number>();
      const variantBySku = new Map<string, number>();

      for (const variant of variantsById.values()) {
        const sizeLabel = variant.size_label?.trim();
        if (sizeLabel) {
          variantByProductSize.set(`${variant.product_id}:${sizeLabel}`, variant.id);
        }
        const sku = variant.sku?.trim();
        if (sku) {
          variantBySku.set(sku, variant.id);
        }
      }

      fixedItems = items.map((item) => {
        if (item.variant_id && item.variant_id !== 0) return item;

        const sizeLabel = item.size?.trim();
        if (sizeLabel) {
          const resolvedBySize = variantByProductSize.get(
            `${item.product_id}:${sizeLabel}`
          );
          if (resolvedBySize) {
            console.log(
              `[Checkout] Fixed variant_id for product ${item.product_id}: ${resolvedBySize}`
            );
            return { ...item, variant_id: resolvedBySize };
          }
        }

        const sku = item.sku?.trim();
        if (sku) {
          const resolvedBySku = variantBySku.get(sku);
          if (resolvedBySku) {
            return { ...item, variant_id: resolvedBySku };
          }
        }

        return item;
      });

      const unresolvedItems = fixedItems.filter(
        (item) => !item.variant_id || item.variant_id === 0
      );

      if (unresolvedItems.length > 0) {
        return NextResponse.json(
          {
            error:
              'No se pudo validar una o más variantes del carrito. Actualiza el carrito e inténtalo de nuevo.',
          },
          { status: 400 }
        );
      }
    }

    // 6. Crear orden y reservar stock usando RPC
    // Esto maneja la concurrencia y evita sobreventa.
    // Compatibilidad: soporta firmas vieja y nueva de create_order_with_stock.
    const legacyCreateOrderPayload = {
      p_user_id: normalizedUserId,
      p_total_cents: total,
      p_items: fixedItems,
      p_shipping_address_id: shippingAddrId,
      p_coupon_code: appliedCoupon?.code || null,
      p_discount_amount: discountAmount,
    };
    const createOrderPayload = {
      ...legacyCreateOrderPayload,
      p_guest_email: normalizedUserId ? null : checkoutEmail,
    };

    let orderId: string | null = null;
    let orderError: RpcError | null = null;

    if (normalizedUserId) {
      const primary = await supa.rpc('create_order_with_stock', legacyCreateOrderPayload);
      orderId = primary.data;
      orderError = primary.error;

      // Fallback para esquema nuevo si solo existe la firma con p_guest_email.
      if ((!orderId || orderError) && isCreateOrderFunctionMissing(orderError)) {
        const fallback = await supa.rpc('create_order_with_stock', createOrderPayload);
        orderId = fallback.data;
        orderError = fallback.error;
      }
    } else {
      // Invitado: primero intenta la firma nueva (con guest_email).
      const primary = await supa.rpc('create_order_with_stock', createOrderPayload);
      orderId = primary.data;
      orderError = primary.error;

      // Fallback para firma vieja sin p_guest_email.
      if ((!orderId || orderError) && isCreateOrderFunctionMissing(orderError)) {
        const fallback = await supa.rpc('create_order_with_stock', legacyCreateOrderPayload);
        orderId = fallback.data;
        orderError = fallback.error;
      }
    }

    if (orderError || !orderId) {
      if (
        !normalizedUserId &&
        (isCreateOrderFunctionMissing(orderError) || isUserIdNotNullViolation(orderError))
      ) {
        return NextResponse.json(
          {
            error:
              'Tu base de datos aún no está actualizada para checkout de invitado. Ejecuta la migración 003_guest_checkout.sql.',
          },
          { status: 500 }
        );
      }

      console.error('Error creating order with stock:', orderError);
      return NextResponse.json(
        { error: orderError?.message || 'Error al procesar el pedido (posible falta de stock)' },
        { status: 400 } // 400 porque puede ser falta de stock
      );
    }

    const normalizedDeliveryMethod =
      delivery_method === "pickup" ? "pickup" : "shipment";
    const { error: deliveryError } = await supa
      .from('orders')
      .update({ delivery_method: normalizedDeliveryMethod })
      .eq('id', orderId);

    if (deliveryError) {
      console.error('Error updating delivery method:', deliveryError);
    }

    const { data: orderSecurityData, error: orderSecurityError } = await supa
      .from('orders')
      .select('public_access_token')
      .eq('id', orderId)
      .single();

    if (orderSecurityError || !orderSecurityData?.public_access_token) {
      if (isPublicAccessTokenColumnMissing(orderSecurityError)) {
        return NextResponse.json(
          {
            error:
              'Tu base de datos aún no está actualizada para enlaces públicos de checkout. Ejecuta la migración 004_public_order_access_token.sql.',
          },
          { status: 500 }
        );
      }

      console.error('Error loading order public token:', orderSecurityError);
      await supa.rpc('release_stock_for_order', { p_order_id: orderId });
      return NextResponse.json(
        { error: 'Error al preparar el enlace seguro del pedido' },
        { status: 500 }
      );
    }

    const publicOrderToken = orderSecurityData.public_access_token;

    // 7. Crear preferencia de MercadoPago
    // Distribuir el descuento entre los items para evitar precios negativos
    const totalItemPrice = fixedItems.reduce((sum, item) => sum + (item.price_cents * item.quantity), 0);

    const mpItems = fixedItems.map((item, idx) => {
      // Calcular proporción del descuento para este item
      let itemDiscount = 0;
      if (totalItemPrice > 0) {
        const itemTotal = item.price_cents * item.quantity;
        const ratio = itemTotal / totalItemPrice;
        itemDiscount = Math.round(discountAmount * ratio);
      }

      // Ajustar precio unitario
      // Nota: MercadoPago requiere unit_price, así que dividimos el total descontado entre cantidad
      const originalTotal = item.price_cents * item.quantity;
      const discountedTotal = Math.max(0, originalTotal - itemDiscount);
      // IMPORTANTE: Redondear a centavos enteros para evitar decimales extraños en pesos
      const unitPriceCents = Math.round(discountedTotal / item.quantity);

      return {
        id: `${orderId}-${idx}`,
        title: item.title,
        description: `Talla: ${item.size}`,
        quantity: item.quantity,
        currency_id: 'MXN',
        unit_price: centsToPesos(unitPriceCents),
      };
    });

    // Agregar envío como item si es > 0
    if (shippingCost > 0) {
      mpItems.push({
        id: `${orderId}-shipping`,
        title: 'Envío',
        description: 'Costo de envío a domicilio',
        quantity: 1,
        currency_id: 'MXN',
        unit_price: centsToPesos(shippingCost),
      });
    }

    const backUrls = getBackUrls();
    const secureBackUrls = {
      success: withPublicAccessParams(backUrls.success, orderId, publicOrderToken),
      failure: withPublicAccessParams(backUrls.failure, orderId, publicOrderToken),
      pending: withPublicAccessParams(backUrls.pending, orderId, publicOrderToken),
    };
    const notificationUrl = getWebhookUrl();

    // Debug: verificar que las URLs se estén generando correctamente
    console.log('[DEBUG] Back URLs:', secureBackUrls);
    console.log('[DEBUG] Notification URL:', notificationUrl);

    const preferenceData = await preferenceClient.create({
      body: {
        items: mpItems,
        external_reference: orderId.toString(),
        back_urls: {
          success: secureBackUrls.success,
          failure: secureBackUrls.failure,
          pending: secureBackUrls.pending,
        },
        auto_return: 'approved', // Redirección automática al aprobarse
        binary_mode: true, // Forzar pagos instantáneos (tarjetas/saldo) y evitar pendientes
        notification_url: notificationUrl,
        statement_descriptor: 'GRASITA MEX',
        payment_methods: {
          excluded_payment_types: [
            { id: 'ticket' },
            { id: 'atm' },
            { id: 'bank_transfer' }
          ],
          // installments: 12 // Removido para evitar conflictos con montos bajos
        },
        payer: {
          name: effectiveShippingAddress?.full_name || checkoutEmail || 'Cliente',
          email: checkoutEmail,
          // Simplificamos el payer para evitar errores de validación de MP
          // MP usará la info guardada del usuario o pedirá lo necesario
        },
      },
    });

    if (!preferenceData || !preferenceData.id) {
      console.error('Error creating MP preference');
      // Si falla MP, debemos liberar el stock (cancelar orden)
      await supa.rpc('release_stock_for_order', { p_order_id: orderId });

      return NextResponse.json(
        { error: 'Error al crear la preferencia de pago' },
        { status: 500 }
      );
    }

    // 8. Actualizar orden con preference_id
    const { error: updateError } = await supa
      .from('orders')
      .update({
        preference_id: preferenceData.id,
        external_reference: orderId,
        // status ya es 'pending_payment' desde el RPC
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order with preference:', updateError);
    }

    return NextResponse.json({
      success: true,
      order_id: orderId,
      preference_id: preferenceData.id,
      init_point: preferenceData.init_point,
      total_cents: total,
    });
  } catch (error) {
    console.error('Error in checkout preference creation:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
