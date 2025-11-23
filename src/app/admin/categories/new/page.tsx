import CategoryForm from "../category-form";

export default function NewCategoryPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Nueva Categoría</h1>
                <p className="text-muted-foreground">
                    Crea una categoría para organizar tus productos.
                </p>
            </div>
            <CategoryForm />
        </div>
    );
}
