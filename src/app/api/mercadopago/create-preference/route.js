import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

export async function POST(req) {
  try {
    const preference = new Preference(client);

    const data = await preference.create({
      body: {
        items: [
          {
            title: "Mi producto",
            quantity: 1,
            unit_price: 2000,
          },
        ],
      },
    });

    // Ojo: revisa qué propiedades te devuelve MercadoPago (a veces es data.id, data.init_point, etc.)
    return NextResponse.json(
      {
        preference_id: data.id,
        preference_url: data.init_point,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating preference", error);
    return NextResponse.json(
      { error: "Error creating preference" },
      { status: 500 }
    );
  }
}
