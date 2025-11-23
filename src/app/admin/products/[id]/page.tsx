import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ProductForm from "../product-form";

export default async function EditProductPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supa = await supabaseServer();

    // Fetch product, categories, assigned categories, and images in parallel
    const [
        { data: product },
        { data: categories },
        { data: assignedCats },
        { data: images },
    ] = await Promise.all([
        supa.from("products").select("*").eq("id", id).single(),
        supa.from("categories").select("id, name, slug, kind").order("name"),
        supa.from("product_categories").select("category_id").eq("product_id", id),
        supa.from("product_images").select("*").eq("product_id", id).order("position"),
    ]);

    if (!product) {
        notFound();
    }

    const initialCategories = assignedCats?.map((c) => c.category_id) ?? [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Editar Producto</h1>
                <p className="text-muted-foreground">
                    Modificando {product.title}
                </p>
            </div>
            <ProductForm
                initialData={product}
                categories={categories ?? []}
                initialCategories={initialCategories}
                initialImages={images ?? []}
            />
        </div>
    );
}
