'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'

type Product = {
  id: number
  title: string
  slug: string
  description: string | null
  brand: string | null
  model_name: string | null
  condition: 'new' | 'used'
  currency: string
  price_cents: number
  published: boolean
}

type Category = { id: number; name: string; slug: string; kind: 'general' | 'model' }

const schema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  model_name: z.string().optional().nullable(),
  condition: z.enum(['new', 'used']),
  currency: z.string().length(3),
  price_value: z.coerce.number().min(0),
  published: z.boolean().optional(),
})

export default function RowActions({ product, categories }: { product: Product; categories: Category[] }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedCats, setSelectedCats] = useState<number[]>([])
  const router = useRouter()
  const { toast } = useToast()

  const catsGeneral = useMemo(() => categories.filter(c => c.kind === 'general'), [categories])
  const catsModel = useMemo(() => categories.filter(c => c.kind === 'model'), [categories])

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: product.title,
      slug: product.slug,
      description: product.description ?? '',
      brand: product.brand ?? '',
      model_name: product.model_name ?? '',
      condition: product.condition,
      currency: product.currency,
      price_value: product.price_cents / 100,
      published: product.published,
    },
  })

  // Carga las categorías actuales del producto cuando se abre
  useEffect(() => {
    if (!open) return
    const load = async () => {
      const supa = supabaseBrowser()
      const { data, error } = await supa
        .from('product_categories')
        .select('category_id')
        .eq('product_id', product.id)
      if (!error && data) {
        setSelectedCats(data.map(d => d.category_id))
      }
    }
    load()
  }, [open, product.id])

  // Guardar cambios (producto + categorías)
  async function onSubmit(values: z.infer<typeof schema>) {
    const supa = supabaseBrowser()
    try {
      const price_cents = Math.round(values.price_value * 100)
      const payload = {
        title: values.title,
        slug: values.slug,
        description: values.description || null,
        brand: values.brand || null,
        model_name: values.model_name || null,
        condition: values.condition,
        currency: values.currency.toUpperCase(),
        price_cents,
        published: !!values.published,
      }

      //  Update del producto
      const { error: upErr } = await supa.from('products').update(payload).eq('id', product.id)
      if (upErr) throw upErr

      //  Diff de categorías
      const { data: existing } = await supa
        .from('product_categories')
        .select('category_id')
        .eq('product_id', product.id)

      const currentIds = new Set((existing ?? []).map(r => r.category_id))
      const targetIds = new Set(selectedCats)

      const toAdd: number[] = []
      const toRemove: number[] = []

      // categorías a agregar
      for (const id of targetIds) if (!currentIds.has(id)) toAdd.push(id)
      // categorías a remover
      for (const id of currentIds) if (!targetIds.has(id)) toRemove.push(id)

      if (toAdd.length > 0) {
        const rows = toAdd.map(cid => ({ product_id: product.id, category_id: cid }))
        const { error } = await supa.from('product_categories').insert(rows)
        if (error) throw error
      }
      if (toRemove.length > 0) {
        const { error } = await supa
          .from('product_categories')
          .delete()
          .in('category_id', toRemove)
          .eq('product_id', product.id)
        if (error) throw error
      }

      toast({ title: 'Producto actualizado', description: `Categorías: +${toAdd.length} / -${toRemove.length}` })
      setOpen(false)
      startTransition(() => router.refresh())
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  async function onDelete() {
    if (!confirm(`¿Eliminar "${product.title}"? Se borrarán variantes e imágenes.`)) return
    const supa = supabaseBrowser()
    try {
      const { error } = await supa.from('products').delete().eq('id', product.id)
      if (error) throw error
      toast({ title: 'Producto eliminado' })
      startTransition(() => router.refresh())
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Editar</Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>Eliminar</Button>
        <a href={`/admin/products/${product.id}/images`} className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm">
          Imágenes
        </a>
        <a href={`/admin/products/${product.id}/variants`} className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm">
          Variantes
        </a>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Datos principales */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e)
                          if (!form.formState.dirtyFields.slug) {
                            form.setValue('slug', slugify(e.target.value), { shouldDirty: true })
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="slug" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="brand" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="model_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="condition" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condición</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">new</SelectItem>
                          <SelectItem value="used">used</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="currency" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda</FormLabel>
                    <FormControl><Input {...field} maxLength={3} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="price_value" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio ({form.watch('currency').toUpperCase()})</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="published" render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0">
                    <FormLabel>Publicado</FormLabel>
                    <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}/>
              </div>

              {/* Descripción */}
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl><Textarea rows={4} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              {/* Categorías */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <Label className="block mb-2">Categorías (general)</Label>
                  <div className="pr-1 space-y-2 overflow-auto max-h-48">
                    {catsGeneral.map(c => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={selectedCats.includes(c.id)}
                          onCheckedChange={(v) => {
                            setSelectedCats(prev => v ? [...prev, c.id] : prev.filter(id => id !== c.id))
                          }}
                        />
                        <span>{c.name}</span>
                      </label>
                    ))}
                    {catsGeneral.length === 0 && <p className="text-xs text-muted-foreground">No hay categorías generales.</p>}
                  </div>
                </div>

                <div>
                  <Label className="block mb-2">Categorías (model)</Label>
                  <div className="pr-1 space-y-2 overflow-auto max-h-48">
                    {catsModel.map(c => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={selectedCats.includes(c.id)}
                          onCheckedChange={(v) => {
                            setSelectedCats(prev => v ? [...prev, c.id] : prev.filter(id => id !== c.id))
                          }}
                        />
                        <span>{c.name}</span>
                      </label>
                    ))}
                    {catsModel.length === 0 && <p className="text-xs text-muted-foreground">No hay categorías de modelo.</p>}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isPending}>Guardar cambios</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
