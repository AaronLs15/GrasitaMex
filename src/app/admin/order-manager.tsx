'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package, Truck, CheckCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type Order = {
    id: string
    status: string
    total_cents: number
    created_at: string
    profiles?: {
        email: string
    }
}

const statusMap: Record<string, { label: string; color: string; next: string; action: string; icon: any }> = {
    paid: {
        label: 'Pagado',
        color: 'bg-green-100 text-green-800',
        next: 'processing',
        action: 'Procesar',
        icon: Package
    },
    processing: {
        label: 'Procesando',
        color: 'bg-blue-100 text-blue-800',
        next: 'shipped',
        action: 'Enviar',
        icon: Truck
    },
    shipped: {
        label: 'Enviado',
        color: 'bg-purple-100 text-purple-800',
        next: 'delivered',
        action: 'Entregar',
        icon: CheckCircle
    },
}

export default function OrderManager({ initialOrders }: { initialOrders: any[] }) {
    const [orders, setOrders] = useState<Order[]>(initialOrders)
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const { toast } = useToast()

    useEffect(() => {
        const supa = supabaseBrowser()

        // Subscribe to order updates
        const channel = supa
            .channel('order-manager')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                async () => {
                    // Refresh the list (simplest way to handle inserts/updates/deletes correctly)
                    const { data } = await supa
                        .from('orders')
                        .select('*, profiles(email)')
                        .in('status', ['paid', 'processing', 'shipped'])
                        .order('created_at', { ascending: true })
                        .limit(10)

                    if (data) setOrders(data)
                }
            )
            .subscribe()

        return () => {
            supa.removeChannel(channel)
        }
    }, [])

    async function advanceStatus(order: Order) {
        const config = statusMap[order.status]
        if (!config) return

        setLoadingId(order.id)
        const supa = supabaseBrowser()

        try {
            const { error } = await supa
                .from('orders')
                .update({ status: config.next })
                .eq('id', order.id)

            if (error) throw error

            toast({ title: 'Estado actualizado', description: `Orden movida a ${config.next}` })

            // Optimistic update
            if (config.next === 'delivered') {
                setOrders(prev => prev.filter(o => o.id !== order.id))
            } else {
                setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: config.next } : o))
            }

        } catch (e: any) {
            toast({ title: 'Error', description: e.message, variant: 'destructive' })
        } finally {
            setLoadingId(null)
        }
    }

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Gestión de Pedidos</CardTitle>
                <CardDescription>Pedidos pendientes de acción.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {orders.map((order) => {
                        const config = statusMap[order.status]
                        if (!config) return null

                        const Icon = config.icon

                        return (
                            <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs text-muted-foreground">
                                            {order.id.slice(0, 8)}...
                                        </span>
                                        <Badge variant="secondary" className={config.color}>
                                            {config.label}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {order.profiles?.email}
                                    </p>
                                </div>

                                <Button
                                    size="sm"
                                    onClick={() => advanceStatus(order)}
                                    disabled={loadingId === order.id}
                                >
                                    {loadingId === order.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Icon className="w-4 h-4 mr-2" />
                                            {config.action}
                                        </>
                                    )}
                                </Button>
                            </div>
                        )
                    })}
                    {orders.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                            <CheckCircle className="w-12 h-12 mb-2 opacity-20" />
                            <p>¡Todo al día!</p>
                            <p className="text-sm">No hay pedidos pendientes de acción.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
