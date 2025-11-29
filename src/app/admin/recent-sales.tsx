'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Sale = {
    id: string
    user_id: string
    total_cents: number
    currency: string
    status: string
    created_at: string
    profiles?: {
        email: string
        display_name: string
    }
}

const statusMap: Record<string, { label: string; color: string }> = {
    created: { label: 'Creado', color: 'bg-gray-100 text-gray-800' },
    pending_payment: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
    paid: { label: 'Pagado', color: 'bg-green-100 text-green-800' },
    processing: { label: 'Procesando', color: 'bg-blue-100 text-blue-800' },
    shipped: { label: 'Enviado', color: 'bg-purple-100 text-purple-800' },
    delivered: { label: 'Entregado', color: 'bg-gray-800 text-white' },
    cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
    refunded: { label: 'Reembolsado', color: 'bg-orange-100 text-orange-800' },
}

export default function RecentSales({ initialSales }: { initialSales: any[] }) {
    const [sales, setSales] = useState<Sale[]>(initialSales)

    useEffect(() => {
        const supa = supabaseBrowser()

        // Subscribe to new orders
        const channel = supa
            .channel('recent-sales')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'orders' },
                async (payload: any) => {
                    // Fetch the full order with profile to display
                    const { data: newOrder } = await supa
                        .from('orders')
                        .select('*, profiles(email, display_name)')
                        .eq('id', payload.new.id)
                        .single()

                    if (newOrder) {
                        setSales((prev) => [newOrder, ...prev].slice(0, 5))
                    }
                }
            )
            .subscribe()

        return () => {
            supa.removeChannel(channel)
        }
    }, [])

    return (
        <Card>
            <CardHeader>
                <CardTitle>Ventas Recientes</CardTitle>
                <CardDescription>Últimas 5 transacciones.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                    {sales.map((sale) => {
                        const name = sale.profiles?.display_name || 'Cliente'
                        const email = sale.profiles?.email || 'Sin correo'
                        const amount = new Intl.NumberFormat('es-MX', {
                            style: 'currency',
                            currency: sale.currency || 'MXN',
                        }).format(sale.total_cents / 100)

                        const statusConfig = statusMap[sale.status] || { label: sale.status, color: 'bg-gray-100' }

                        return (
                            <div key={sale.id} className="flex items-center">
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={`https://avatar.vercel.sh/${email}`} alt="Avatar" />
                                    <AvatarFallback>{name[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="ml-4 space-y-1">
                                    <p className="text-sm font-medium leading-none">{name}</p>
                                    <p className="text-sm text-muted-foreground">{email}</p>
                                </div>
                                <div className="ml-auto flex flex-col items-end gap-1">
                                    <div className="font-medium">{amount}</div>
                                    <Badge variant="secondary" className={`text-[10px] px-1 py-0 ${statusConfig.color}`}>
                                        {statusConfig.label}
                                    </Badge>
                                </div>
                            </div>
                        )
                    })}
                    {sales.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No hay ventas recientes.
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
