'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

type Product = {
  id: number
  title: string
}

export default function RowActions({ product }: { product: Product; categories?: any[] }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { toast } = useToast()

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
    <div className="flex gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`/admin/products/${product.id}`}>Editar</Link>
      </Button>
      <Button variant="destructive" size="sm" onClick={onDelete} disabled={isPending}>
        Eliminar
      </Button>
      <a href={`/admin/products/${product.id}/images`} className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
        Imágenes
      </a>
      <a href={`/admin/products/${product.id}/variants`} className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
        Variantes
      </a>
    </div>
  )
}
