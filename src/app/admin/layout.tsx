import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import Link from 'next/link'
import LogoutButton from './logout-button'
import { Toaster } from 'sonner'
import WebButton from './web-button'
import { ModeToggle } from '@/components/mode-toggle'
import { LayoutDashboard, Tag, Package, Ticket, ShoppingCart, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supa = await supabaseServer()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supa
    .from('profiles')
    .select('role, display_name, email')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') redirect('/customer')

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/categories', label: 'Categorías', icon: Tag },
    { href: '/admin/products', label: 'Productos', icon: Package },
    { href: '/admin/coupons', label: 'Cupones', icon: Ticket },
    { href: '/admin/orders', label: 'Pedidos', icon: ShoppingCart },
  ]

  return (
    <div className="min-h-screen bg-muted/10">
      {/* Sidebar Desktop */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r bg-background md:block">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-lg">
            <span>GrasitaMex Admin</span>
          </Link>
        </div>
        <div className="flex flex-col gap-2 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-primary"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 border-t p-4 bg-background">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{profile.display_name || 'Admin'}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[180px]">{profile.email}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <LogoutButton />
            <ModeToggle />
          </div>
        </div>
      </aside>

      {/* Mobile Header & Content Wrapper */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur px-4 md:px-6">
          <div className="flex items-center gap-4 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex h-16 items-center border-b px-6">
                  <span className="font-bold text-lg">GrasitaMex Admin</span>
                </div>
                <div className="flex flex-col gap-2 p-4">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-primary"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
                <div className="absolute bottom-0 left-0 right-0 border-t p-4">
                  <div className="flex items-center justify-between gap-2">
                    <LogoutButton />
                    <ModeToggle />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <span className="font-bold md:hidden">Admin</span>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <WebButton />
            <div className="hidden md:block">
              <ModeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          {children}
          <Toaster />
        </main>
      </div>
    </div>
  )
}