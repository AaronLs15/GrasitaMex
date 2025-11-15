'use client'

import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import DarkVeil from '@/components/DarkVeil'

const schema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export default function LoginPage() {
  const { toast } = useToast()
  const router = useRouter()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: z.infer<typeof schema>) {
    const supa = supabaseBrowser()
    const { data, error } = await supa.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return
    }

    const userId = data.user?.id
    let role: string | null = null

    if (userId) {
      const { data: profile } = await supa
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      role = profile?.role ?? null
    }

    const destination = role === 'admin' ? '/admin' : '/costumer'
    toast({ title: 'Bienvenido', description: 'Sesión iniciada' })
    router.replace(destination)
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <DarkVeil
          resolutionScale={1}
        />
      </div>

      {/* Contenido encima del background */}
      <div className="relative grid min-h-screen place-items-center">
        <Card className="w-full max-w-sm bg-background/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Iniciar sesión</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo</FormLabel>
                      <FormControl>
                        <Input placeholder="tu@correo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button className="w-full text-white bg-black hover:bg-black/80" type="submit">
                  Entrar
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Usa tu usuario admin para acceder al panel.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

