import { supabaseServer } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { revalidatePath } from "next/cache";

export default async function CategoriesPage() {
  const supa = await supabaseServer();
  const { data: cats, error } = await supa
    .from("categories")
    .select("id, name, slug, kind, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  async function deleteCategory(formData: FormData) {
    "use server";
    const id = formData.get("id");
    const supa = await supabaseServer();
    await supa.from("categories").delete().eq("id", id);
    revalidatePath("/admin/categories");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
        <Button asChild>
          <Link href="/admin/categories/new">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Categoría
          </Link>
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cats?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No hay categorías registradas.
                </TableCell>
              </TableRow>
            ) : (
              cats?.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell>{cat.slug}</TableCell>
                  <TableCell className="capitalize">{cat.kind}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/admin/categories/${cat.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </Button>
                      <form action={deleteCategory}>
                        <input type="hidden" name="id" value={cat.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
