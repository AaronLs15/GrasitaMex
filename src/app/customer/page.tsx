import { supabaseServer } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShoppingBag, MapPin, User } from 'lucide-react'
import { formatMoney } from '@/lib/mercadopago'
import { formatInMexicoCity } from '@/lib/dates'

export default async function CustomerDashboard() {
    const supa = await supabaseServer()
    const { data: { user } } = await supa.auth.getUser()

    if (!user) return null

    // Fetch recent orders
    const { data: recentOrders } = await supa
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)

    // Fetch profile
    const { data: profile } = await supa
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Hola, {profile?.display_name || 'Cliente'}</h1>
                <p className="text-muted-foreground">Bienvenido a tu panel de control.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mis Pedidos</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{recentOrders?.length || 0}</div>
                        <p className="text-xs text-muted-foreground">Recientes</p>
                        <Button asChild variant="link" className="px-0 mt-2 h-auto">
                            <Link href="/customer/orders">Ver todos</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Direcciones</CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">-</div>
                        <p className="text-xs text-muted-foreground">Gestiona tus envíos</p>
                        <Button asChild variant="link" className="px-0 mt-2 h-auto">
                            <Link href="/customer/addresses">Administrar</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Perfil</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Cuenta</div>
                        <p className="text-xs text-muted-foreground">Datos personales</p>
                        <Button asChild variant="link" className="px-0 mt-2 h-auto">
                            <Link href="/customer/profile">Editar</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Pedidos Recientes</h2>
                {recentOrders && recentOrders.length > 0 ? (
                    <div className="grid gap-4">
                        {recentOrders.map((order) => (
                            <Card key={order.id}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">Pedido #{order.external_reference?.slice(0, 8) || order.id.slice(0, 8)}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {formatInMexicoCity(order.created_at, "PPP")}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">{formatMoney(order.total_cents)}</p>
                                        <span className={`text-xs px-2 py-1 rounded-full ${order.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            No tienes pedidos recientes.
                            <div className="mt-4">
                                <Button asChild>
                                    <Link href="/modelos">Ir a comprar</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
