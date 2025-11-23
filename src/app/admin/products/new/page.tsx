import { supabaseServer } from "@/lib/supabase/server";
import ProductForm from "../product-form";

export default async function NewProductPage() {
    const supa = await supabaseServer();
    const { data: categories } = await supa
        .from("categories")
        .select("id, name, slug, kind")
        .order("name");

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Nuevo Producto</h1>
                <p className="text-muted-foreground">
                    Agrega un nuevo par a tu inventario.
                </p>
            </div>
            <ProductForm categories={categories ?? []} />
        </div>
    );
}
