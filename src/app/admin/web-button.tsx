'use client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function WebButton() {
  const router = useRouter()
  return (
    <Button variant="outline" onClick={async () => {
      router.replace('/')
    }}>
      Pagina WEB
    </Button>
  )
}