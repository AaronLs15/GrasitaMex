// app/layout.tsx
import type { Metadata } from 'next'
import './global.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Admin - GrasitaMex',
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
        {children}
        <Toaster />
      </body>
    </html>
  )
}
