
// app/layout.tsx
import type { Metadata } from 'next'
import './global.css'
import { Inter } from 'next/font/google'
import { CartProvider } from '@/context/cart-context'
import { Toaster } from '@/components/ui/sonner'
import { Suspense } from 'react'
import AnalyticsTracker from "@/components/analytics-tracker";
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GrasitaMex',
  description: 'Panel de administración',
  authors: [{ name: "Aaron Lujano" }],
  icons: {
    icon: '/logoGrasitaMex.ico'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <Suspense>
          <AnalyticsTracker />
        </Suspense>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CartProvider>
            {children}
            <Toaster />
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
