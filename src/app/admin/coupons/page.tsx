import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function CouponsPage() {
    const supa = await supabaseServer();
    const { data: coupons } = await supa
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

    async function deleteCoupon(formData: FormData) {
        "use server";
        const id = formData.get("id");
        const supa = await supabaseServer();
        await supa.from("coupons").delete().eq("id", id);
        revalidatePath("/admin/coupons");
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Cupones</h1>
                <Button asChild>
                    <Link href="/admin/coupons/new">
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Cupón
                    </Link>
                </Button>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Descuento</TableHead>
                            <TableHead>Uso</TableHead>
                            <TableHead>Estatus</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {coupons?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No hay cupones registrados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            coupons?.map((coupon) => (
                                <TableRow key={coupon.id}>
                                    <TableCell className="font-medium">{coupon.code}</TableCell>
                                    <TableCell>
                                        {coupon.discount_type === "percentage"
                                            ? `${coupon.discount_value}%`
                                            : `$${coupon.discount_value}`}
                                    </TableCell>
                                    <TableCell>
                                        {coupon.used_count} /{" "}
                                        {coupon.usage_limit ? coupon.usage_limit : "∞"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={coupon.active ? "default" : "secondary"}>
                                            {coupon.active ? "Activo" : "Inactivo"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button asChild variant="ghost" size="icon">
                                                <Link href={`/admin/coupons/${coupon.id}`}>
                                                    <Pencil className="w-4 h-4" />
                                                </Link>
                                            </Button>
                                            <form action={deleteCoupon}>
                                                <input type="hidden" name="id" value={coupon.id} />
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
