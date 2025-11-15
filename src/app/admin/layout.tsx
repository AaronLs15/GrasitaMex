// app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import Link from 'next/link'
import LogoutButton from './logout-button'
import { Toaster } from 'sonner'
import WebButton from './web-button'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supa = await supabaseServer()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supa
    .from('profiles')
    .select('role, display_name, email')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') redirect('/costumer')

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="px-4 mx-auto sm:px-6 max-w-7xl">
          {/* Desktop Navigation */}
          <div className="items-center justify-between hidden md:flex h-14">
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/admin" className="font-medium transition-colors hover:text-foreground">
                Dashboard
              </Link>
              <Link href="/admin/categories" className="transition-colors hover:text-foreground">
                Categorías
              </Link>
              <Link href="/admin/products" className="transition-colors hover:text-foreground">
                Productos
              </Link>
            </nav>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground truncate max-w-[200px]">
                {profile.display_name ?? profile.email}
              </span>
              <LogoutButton />
              <WebButton />
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            {/* Top row: User info and buttons */}
            <div className="flex items-center justify-between border-b h-14">
              <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                {profile.display_name ?? profile.email}
              </span>
              <div className="flex items-center gap-2">
                <LogoutButton />
                <WebButton />
              </div>
            </div>
            
            {/* Bottom row: Navigation links */}
            <nav className="flex items-center gap-1 py-2 overflow-x-auto">
              <Link 
                href="/admin" 
                className="px-3 py-1.5 text-sm font-medium whitespace-nowrap hover:bg-muted rounded-md transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                href="/admin/categories"
                className="px-3 py-1.5 text-sm whitespace-nowrap hover:bg-muted rounded-md transition-colors"
              >
                Categorías
              </Link>
              <Link 
                href="/admin/products"
                className="px-3 py-1.5 text-sm whitespace-nowrap hover:bg-muted rounded-md transition-colors"
              >
                Productos
              </Link>
            </nav>
          </div>
        </div>
      </header>
      
      <main className="p-4 mx-auto sm:p-6 max-w-7xl">
        {children}
        <Toaster />
      </main>
    </div>
  )
}