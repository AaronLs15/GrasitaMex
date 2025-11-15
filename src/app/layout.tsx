// app/layout.tsx
import type { Metadata } from 'next'
import './global.css'
import { Toaster } from 'sonner'
import { CartProvider } from '@/context/cart-context'

export const metadata: Metadata = {
  title: 'GrasitaMex',
  description: 'Panel de administración',
  authors: [{name: "Aaron Lujano"}],
  icons : {
    icon: '/logoGrasitaMex.ico'
  }

}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <CartProvider>
          {children}
          <Toaster />
        </CartProvider>
      </body>
    </html>
  )
}
