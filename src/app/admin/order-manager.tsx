'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package, Truck, CheckCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { notifyOrderStatus } from '@/app/actions/email-actions'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Order = {
    id: string
    status: string
    total_cents: number
    created_at: string
    delivery_method?: 'shipment' | 'pickup'
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
    const [shippingDialogOpen, setShippingDialogOpen] = useState(false)
    const [shippingOrderId, setShippingOrderId] = useState<string | null>(null)
    const [shippingSender, setShippingSender] = useState<'Estafeta' | 'DHL' | 'Fedex'>('Estafeta')
    const [shippingTracking, setShippingTracking] = useState('')
    const [shippingError, setShippingError] = useState<string | null>(null)
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

    function openShippingDialog(orderId: string) {
        setShippingOrderId(orderId)
        setShippingSender('Estafeta')
        setShippingTracking('')
        setShippingError(null)
        setShippingDialogOpen(true)
    }

    async function advanceStatus(order: Order) {
        const config = statusMap[order.status]
        if (!config) return

        if (config.next === 'shipped' && order.delivery_method === 'shipment') {
            openShippingDialog(order.id)
            return
        }

        await submitStatus(order.id, config.next)
    }

    async function submitStatus(
        orderId: string,
        nextStatus: string,
        trackingNumber?: string,
        sender?: 'Estafeta' | 'DHL' | 'Fedex'
    ) {
        setLoadingId(orderId)
        const supa = supabaseBrowser()

        try {
            const { error } = await supa
                .from('orders')
                .update({ status: nextStatus })
                .eq('id', orderId)

            if (error) throw error

            toast({ title: 'Estado actualizado', description: `Orden movida a ${nextStatus}` })

            // Trigger Email Notifications (non-blocking)
            notifyOrderStatus(orderId, nextStatus, { trackingNumber, sender }).then(res => {
                if (!res.success) console.error('Error sending status email:', res.error)
            })

            // Optimistic update
            if (nextStatus === 'delivered') {
                setOrders(prev => prev.filter(o => o.id !== orderId))
            } else {
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o))
            }

        } catch (e: any) {
            toast({ title: 'Error', description: e.message, variant: 'destructive' })
        } finally {
            setLoadingId(null)
        }
    }

    function handleShippingSubmit() {
        if (!shippingOrderId) return
        if (!shippingTracking.trim()) {
            setShippingError('Ingresa el tracking ID.')
            return
        }
        setShippingError(null)
        setShippingDialogOpen(false)
        submitStatus(
            shippingOrderId,
            'shipped',
            shippingTracking.trim(),
            shippingSender
        )
    }

    return (
        <>
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
            <Dialog open={shippingDialogOpen} onOpenChange={setShippingDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Datos de envio</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Paqueteria</Label>
                        <Select value={shippingSender} onValueChange={(value) => setShippingSender(value as any)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Estafeta">Estafeta</SelectItem>
                                <SelectItem value="DHL">DHL</SelectItem>
                                <SelectItem value="Fedex">Fedex</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Tracking ID</Label>
                        <Input
                            value={shippingTracking}
                            onChange={(e) => setShippingTracking(e.target.value)}
                            placeholder="Ingresa el tracking"
                        />
                        {shippingError && (
                            <p className="text-xs text-destructive">{shippingError}</p>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShippingDialogOpen(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleShippingSubmit}>
                        Guardar y enviar
                    </Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>
        </>
    )
}
