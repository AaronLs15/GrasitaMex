// app/admin/categories/page.tsx
import { supabaseServer } from '@/lib/supabase/server'
import CategoriesClient from './widgets'

export default async function CategoriesPage() {
  const supa = await supabaseServer()
  const { data: cats, error } = await supa
    .from('categories')
    .select('id, name, slug, kind, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error

  return <CategoriesClient initial={cats ?? []} />
}
