import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import Link from 'next/link'
import LogoutButton from '@/app/admin/logout-button' // Reusing logout button
import { Toaster } from 'sonner'
import { User, MapPin, ShoppingBag, Home } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
    const supa = await supabaseServer()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supa
        .from('profiles')
        .select('role, display_name, email')
        .eq('id', user.id)
        .maybeSingle()

    // Allow both customer and admin to view customer dashboard (admins might want to see how it looks)
    // But primarily for customers.
    if (!profile) redirect('/login')

    const navItems = [
        { href: '/customer', label: 'Resumen', icon: Home },
        { href: '/customer/profile', label: 'Mi Perfil', icon: User },
        { href: '/customer/addresses', label: 'Direcciones', icon: MapPin },
        { href: '/customer/orders', label: 'Mis Pedidos', icon: ShoppingBag },
    ]

    return (
        <div className="min-h-screen flex flex-col md:flex-row">
            {/* Sidebar / Mobile Header */}
            <aside className="w-full md:w-64 bg-muted/30 border-r min-h-[auto] md:min-h-screen flex flex-col">
                <div className="p-4 border-b flex items-center justify-between md:block">
                    <div className="font-bold text-lg mb-0 md:mb-4">Mi Cuenta</div>
                    <div className="md:hidden">
                        {/* Mobile menu trigger could go here, but for simplicity we'll list items below on mobile */}
                    </div>
                    <div className="text-sm text-muted-foreground truncate hidden md:block">
                        {profile.display_name || profile.email}
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-x-auto md:overflow-visible flex md:block">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors whitespace-nowrap"
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t mt-auto">
                    <div className="flex items-center justify-between gap-2 mb-4">
                        <ModeToggle />
                        <LogoutButton />
                    </div>
                    <Link href="/" className="text-sm text-muted-foreground hover:underline block text-center">
                        Volver a la tienda
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    {children}
                </div>
                <Toaster />
            </main>
        </div>
    )
}
