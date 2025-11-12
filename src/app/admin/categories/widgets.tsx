'use client'

import { useMemo, useState, useTransition } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabaseBrowser } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Pencil, Trash2, Plus } from 'lucide-react'

type Category = {
  id: number
  name: string
  slug: string
  kind: 'general' | 'model'
  created_at: string
}

export default function CategoriesClient({ initial }: { initial: Category[] }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

  const data = useMemo(() => initial, [initial])

  const schema = z.object({
    name: z.string().min(2),
    slug: z.string().min(2),
    kind: z.enum(['general', 'model']),
  })

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', slug: '', kind: 'general' },
  })

  function openCreate() {
    setEditing(null)
    form.reset({ name: '', slug: '', kind: 'general' })
    setOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    form.reset({ name: cat.name, slug: cat.slug, kind: cat.kind })
    setOpen(true)
  }

  async function onSubmit(values: z.infer<typeof schema>) {
    const supa = supabaseBrowser()
    const payload = { ...values }
    try {
      if (editing) {
        const { error } = await supa.from('categories')
          .update(payload).eq('id', editing.id)
        if (error) throw error
        toast({ title: 'Categoría actualizada' })
      } else {
        const { error } = await supa.from('categories')
          .insert(payload)
        if (error) throw error
        toast({ title: 'Categoría creada' })
      }
      setOpen(false)
      startTransition(() => router.refresh())
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  async function onDelete(cat: Category) {
    const supa = supabaseBrowser()
    if (!confirm(`¿Eliminar categoría "${cat.name}"?`)) return
    try {
      const { error } = await supa.from('categories').delete().eq('id', cat.id)
      if (error) throw error
      toast({ title: 'Categoría eliminada' })
      startTransition(() => router.refresh())
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categorías</h1>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nueva</Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-[140px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                <TableCell><span className="text-xs px-2 py-1 rounded bg-muted">{c.kind}</span></TableCell>
                <TableCell className="space-x-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(c)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Borrar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  No hay categorías todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e)
                          const next = slugify(e.target.value)
                          if (!editing) form.setValue('slug', next, { shouldDirty: true })
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">general</SelectItem>
                          <SelectItem value="model">model</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isPending}>
                  {editing ? 'Guardar cambios' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
