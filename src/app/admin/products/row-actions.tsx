'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import PosSaleDialog from './pos-sale-dialog'

type Product = {
  id: number
  title: string
  price_cents: number
  currency: string
}

export default function RowActions({ product }: { product: Product }) {
  const [isPending, startTransition] = useTransition()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function onDelete() {
    const supa = supabaseBrowser()
    try {
      const { error } = await supa.from('products').delete().eq('id', product.id)
      if (error) throw error
      setIsDeleteDialogOpen(false)
      toast({ title: 'Producto eliminado' })
      startTransition(() => router.refresh())
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <PosSaleDialog product={product} />
      <Button asChild variant="outline" size="sm">
        <Link href={`/admin/products/${product.id}`}>Editar</Link>
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setIsDeleteDialogOpen(true)}
        disabled={isPending}
      >
        Eliminar
      </Button>
      <a href={`/admin/products/${product.id}/images`} className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
        Imágenes
      </a>
      <a href={`/admin/products/${product.id}/variants`} className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
        Variantes
      </a>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar producto</DialogTitle>
            <DialogDescription>
              Esta acción eliminará &quot;{product.title}&quot;, sus variantes,
              imágenes y relaciones de categorías. El historial de órdenes se conservará.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
              disabled={isPending}
            >
              {isPending ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
