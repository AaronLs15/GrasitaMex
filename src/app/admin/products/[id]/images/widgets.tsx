'use client'

import { useState, useTransition } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { storagePathFromPublicUrl } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { ArrowDown, ArrowUp, Trash2, Upload } from 'lucide-react'

type Img = { id: number; url: string; position: number }

export default function ProductImagesClient({
  productId,
  productTitle,
  initialImages,
}: {
  productId: number
  productTitle: string
  initialImages: Img[]
}) {
  const [files, setFiles] = useState<FileList | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const router = useRouter()

  async function handleUpload() {
    if (!files || files.length === 0) return
    const supa = supabaseBrowser()
    try {
      // Trae la posición máxima actual
      const { data: maxRows } = await supa
        .from('product_images')
        .select('position')
        .eq('product_id', productId)
        .order('position', { ascending: false })
        .limit(1)

      let pos = maxRows?.[0]?.position ?? 0

      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()
        const name = crypto.randomUUID() + (ext ? `.${ext}` : '')
        const path = `${productId}/${name}`
        const { error: upErr } = await supa.storage
          .from('product-images')
          .upload(path, file, { upsert: false })
        if (upErr) throw upErr

        // Public URL
        const { data: publicUrl } = supa.storage
          .from('product-images')
          .getPublicUrl(path)

        // Inserta en DB
        pos += 1
        const { error: insErr } = await supa.from('product_images').insert({
          product_id: productId,
          url: publicUrl.publicUrl,
          position: pos,
        })
        if (insErr) throw insErr
      }

      toast({ title: 'Imágenes subidas' })
      setFiles(null)
      startTransition(() => router.refresh())
    } catch (e: any) {
      toast({ title: 'Error subiendo', description: e.message, variant: 'destructive' })
    }
  }

  async function handleDelete(img: Img) {
    if (!confirm('¿Eliminar imagen?')) return
    const supa = supabaseBrowser()
    try {
      const path = storagePathFromPublicUrl(img.url)
      if (path) {
        await supa.storage.from('product-images').remove([path])
      }
      const { error } = await supa.from('product_images').delete().eq('id', img.id)
      if (error) throw error
      toast({ title: 'Imagen eliminada' })
      startTransition(() => router.refresh())
    } catch (e: any) {
      toast({ title: 'Error eliminando', description: e.message, variant: 'destructive' })
    }
  }

  async function move(img: Img, dir: 'up' | 'down') {
    const supa = supabaseBrowser()
    try {
      const offset = dir === 'up' ? -1 : 1
      const nextPos = img.position + offset
      if (nextPos < 1) return

      // Encuentra el que tiene esa posición
      const { data: other } = await supa
        .from('product_images')
        .select('id, position')
        .eq('product_id', productId)
        .eq('position', nextPos)
        .maybeSingle()

      // Intercambia posiciones (transacción simple en cliente)
      const updates = [{ id: img.id, position: nextPos }]
      if (other) updates.push({ id: other.id, position: img.position })

      const { error } = await supa.from('product_images').upsert(updates)
      if (error) throw error
      startTransition(() => router.refresh())
    } catch (e: any) {
      // No es crítico; solo feedback
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Imágenes de {productTitle}</h1>
        <p className="text-sm text-muted-foreground">Sube y organiza las imágenes del producto.</p>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} />
          <Button onClick={handleUpload} disabled={!files || isPending}>
            <Upload className="h-4 w-4 mr-2" /> Subir
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Formatos comunes soportados (jpg, png, webp). Se publican en el bucket <code>product-images</code>.
        </p>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {initialImages.map((img) => (
          <Card key={img.id} className="overflow-hidden">
            <div className="aspect-square overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="p-2 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">pos. {img.position}</div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => move(img, 'up')}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => move(img, 'down')}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="icon" variant="destructive" onClick={() => handleDelete(img)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
