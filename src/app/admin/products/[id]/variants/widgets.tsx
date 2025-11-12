'use client'

import { useState, useTransition } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'

type Variant = {
  id: number
  sku: string
  size_label: string
  qty: number
  active: boolean
  created_at: string
}

const schema = z.object({
  sku: z.string().min(1, 'Requerido'),
  size_label: z.string().min(1, 'Requerido'),
  qty: z.coerce.number().int().min(0),
  active: z.boolean().optional(),
})

export default function VariantsClient({
  productId,
  productTitle,
  initial,
}: {
  productId: number
  productTitle: string
  initial: Variant[]
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Variant | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { sku: '', size_label: '', qty: 1, active: true },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ sku: '', size_label: '', qty: 1, active: true })
    setOpen(true)
  }
  function openEdit(v: Variant) {
    setEditing(v)
    form.reset({ sku: v.sku, size_label: v.size_label, qty: v.qty, active: v.active })
    setOpen(true)
  }

  async function onSubmit(values: z.infer<typeof schema>) {
    const supa = supabaseBrowser()
    try {
      if (editing) {
        const { error } = await supa.from('product_variants')
          .update({
            sku: values.sku,
            size_label: values.size_label,
            qty: values.qty,
            active: !!values.active,
          })
          .eq('id', editing.id)
        if (error) throw error
        toast({ title: 'Variante actualizada' })
      } else {
        const { error } = await supa.from('product_variants')
          .insert({
            product_id: productId,
            sku: values.sku,
            size_label: values.size_label,
            qty: values.qty,
            active: !!values.active,
          })
        if (error) throw error // si rompe por SKU único, vendrá aquí
        toast({ title: 'Variante creada' })
      }
      setOpen(false)
      startTransition(() => router.refresh())
    } catch (e: any) {
      // errores típicos: unique_violation (SKU), check constraints
      const msg = /duplicate key value/.test(e.message)
        ? 'SKU duplicado: ya existe una variante con ese SKU.'
        : e.message
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    }
  }

  async function onDelete(v: Variant) {
    if (!confirm(`¿Eliminar variante SKU ${v.sku}?`)) return
    const supa = supabaseBrowser()
    try {
      const { error } = await supa.from('product_variants').delete().eq('id', v.id)
      if (error) throw error
      toast({ title: 'Variante eliminada' })
      startTransition(() => router.refresh())
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Variantes de {productTitle}</h1>
        <p className="text-sm text-muted-foreground">Gestiona tallas/SKU/stock de este producto.</p>
      </div>

      <div className="flex items-center justify-between">
        <div />
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Nueva variante</Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Talla</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Activa</TableHead>
              <TableHead className="w-[180px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.map(v => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.sku}</TableCell>
                <TableCell>{v.size_label}</TableCell>
                <TableCell>{v.qty}</TableCell>
                <TableCell>{v.active ? 'Sí' : 'No'}</TableCell>
                <TableCell className="space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(v)}>
                    <Pencil className="w-4 h-4 mr-1" /> Editar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(v)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Borrar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {initial.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Aún no hay variantes.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar variante' : 'Nueva variante'}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField control={form.control} name="sku" render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="size_label" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Talla</FormLabel>
                    <FormControl><Input placeholder="US M 9 / MX 27" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="qty" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad</FormLabel>
                    <FormControl><Input type="number" min="0" step="1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="active" render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0">
                    <FormLabel>Activa</FormLabel>
                    <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}/>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isPending}>{editing ? 'Guardar' : 'Crear'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}