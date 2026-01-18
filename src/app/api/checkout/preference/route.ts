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
  user_id: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: CreatePreferenceRequest = await req.json();
    const { items, shipping_address, delivery_method, billing_address, coupon_code, user_id } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No hay items en el carrito' },
        { status: 400 }
      );
    }

    if (!user_id) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    // Security Check: Verify the session user matches the requested user_id
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

    if (!user || user.id !== user_id) {
      return NextResponse.json(
        { error: 'Unauthorized: User ID mismatch' },
        { status: 403 }
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

    // 2. Calcular envío (gratis si >= $2000 MXN)
    const shippingCost = delivery_method === "pickup" ? 0 : subtotal >= 200000 ? 0 : 1500; // $15 MXN

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
            user_id,
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
    // Esto es necesario si el frontend no está enviando el variant_id correcto
    const fixedItems = await Promise.all(items.map(async (item) => {
      if (!item.variant_id || item.variant_id === 0) {
        // Buscar la variante por producto y talla
        const { data: variant } = await supa
          .from('product_variants')
          .select('id, qty')
          .eq('product_id', item.product_id)
          .eq('size_label', item.size) // Asumiendo que item.size tiene el label correcto
          .single();

        if (variant) {
          console.log(`[Checkout] Fixed variant_id for product ${item.product_id}: ${variant.id}`);
          return { ...item, variant_id: variant.id };
        }

        // Si no se encuentra por talla, intentar por SKU si existe
        if (item.sku) {
          const { data: variantBySku } = await supa
            .from('product_variants')
            .select('id, qty')
            .eq('sku', item.sku)
            .single();

          if (variantBySku) {
            return { ...item, variant_id: variantBySku.id };
          }
        }
      }
      return item;
    }));

    // 6. Crear orden y reservar stock usando RPC
    // Esto maneja la concurrencia y evita sobreventa
    const { data: orderId, error: orderError } = await supa.rpc('create_order_with_stock', {
      p_user_id: user_id,
      p_total_cents: total,
      p_items: fixedItems, // Usar los items corregidos
      p_shipping_address_id: shippingAddrId,
      p_coupon_code: appliedCoupon?.code || null,
      p_discount_amount: discountAmount
    });

    if (orderError || !orderId) {
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
    const notificationUrl = getWebhookUrl();

    // Debug: verificar que las URLs se estén generando correctamente
    console.log('[DEBUG] Back URLs:', backUrls);
    console.log('[DEBUG] Notification URL:', notificationUrl);

    const preferenceData = await preferenceClient.create({
      body: {
        items: mpItems,
        external_reference: orderId.toString(),
        back_urls: {
          success: backUrls.success,
          failure: backUrls.failure,
          pending: backUrls.pending,
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
          name: effectiveShippingAddress?.full_name || user.email || 'Pickup',
          email: user.email || 'guest@grasitamex.com', // Fallback seguro
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
