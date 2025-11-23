import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import CouponForm from "../coupon-form";

export default async function EditCouponPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supa = await supabaseServer();
    const { data: coupon } = await supa
        .from("coupons")
        .select("*")
        .eq("id", id)
        .single();

    if (!coupon) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Editar Cupón</h1>
                <p className="text-muted-foreground">
                    Modifica las reglas del cupón {coupon.code}.
                </p>
            </div>
            <CouponForm initialData={coupon} />
        </div>
    );
}
