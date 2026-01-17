
// app/layout.tsx
import type { Metadata } from 'next'
import './global.css'
import { Inter } from 'next/font/google'
import { CartProvider } from '@/context/cart-context'
import { Toaster } from '@/components/ui/sonner'
import { Suspense } from 'react'
import AnalyticsTracker from "@/components/analytics-tracker";
import { ThemeProvider } from "@/components/theme-provider"

import NextTopLoader from 'nextjs-toploader';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GrasitaMex',
  description: 'Tienda online de sneakers limitados y originales. Encuentra las mejores zapatillas de edición limitada y disfruta de envíos rápidos y seguros en GrasitaMex.',
  authors: [{ name: "botz" }],
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
        <NextTopLoader
          color="#DFC34A"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #DFC34A,0 0 5px #DFC34A"
        />
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
