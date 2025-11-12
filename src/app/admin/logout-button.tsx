'use client'
import { Button } from '@/components/ui/button'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()
  return (
    <Button variant="outline" onClick={async () => {
      const supa = supabaseBrowser()
      await supa.auth.signOut()
      router.replace('/login')
    }}>
      Cerrar sesión
    </Button>
  )
}
