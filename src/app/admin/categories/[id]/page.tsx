import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import CategoryForm from "../category-form";

export default async function EditCategoryPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supa = await supabaseServer();
    const { data: category } = await supa
        .from("categories")
        .select("*")
        .eq("id", id)
        .single();

    if (!category) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Editar Categoría</h1>
                <p className="text-muted-foreground">
                    Modificando {category.name}
                </p>
            </div>
            <CategoryForm initialData={category} />
        </div>
    );
}
