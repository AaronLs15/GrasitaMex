// app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import Link from 'next/link'
import LogoutButton from './logout-button'
import {  Toaster } from 'sonner'
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

  if (!profile || profile.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="flex items-center justify-between px-6 mx-auto max-w-7xl h-14">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="font-medium">Dashboard</Link>
            <Link href="/admin/categories">Categorías</Link>
            <Link href="/admin/products">Productos</Link>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{profile.display_name ?? profile.email}</span>
            <LogoutButton />
            <WebButton />
          </div>
        </div>
      </header>
      <main className="p-6 mx-auto max-w-7xl">
        {children}
      <Toaster/>
      </main>
    </div>
  )
}
