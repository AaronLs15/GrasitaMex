'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteProduct } from './actions'
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
  price_cents: number | null
  pricing_mode: 'general' | 'variant'
  currency: string
}

export default function RowActions({ product }: { product: Product }) {
  const [isPending, startTransition] = useTransition()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function onDelete() {
    try {
      const result = await deleteProduct(product.id)
      setIsDeleteDialogOpen(false)
      toast({
        title: 'Producto eliminado',
        description: result.cleanupPending ? 'La limpieza de algunas imágenes quedó programada para reintento.' : undefined,
      })
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
