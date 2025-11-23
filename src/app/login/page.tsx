'use client'

import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import DarkVeil from '@/components/DarkVeil'

const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

const registerSchema = z.object({
  registerEmail: z.string().email('Correo inválido'),
  registerPassword: z.string().min(6, 'Mínimo 6 caracteres'),
  confirmPassword: z.string().min(6, 'Mínimo 6 caracteres'),
}).refine((data) => data.registerPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

export default function LoginPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [isRegisterMode, setIsRegisterMode] = useState(false)

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { registerEmail: '', registerPassword: '', confirmPassword: '' },
  })

  async function onLogin(values: z.infer<typeof loginSchema>) {
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

  async function onRegister(values: z.infer<typeof registerSchema>) {
    const supa = supabaseBrowser()
    const { data, error } = await supa.auth.signUp({
      email: values.registerEmail,
      password: values.registerPassword,
    })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return
    }

    toast({ 
      title: 'Registro exitoso', 
      description: 'Por favor verifica tu correo electrónico' 
    })
    
    registerForm.reset()
    setIsRegisterMode(false)
  }

  function handleModeChange() {
    setIsRegisterMode(!isRegisterMode)
    loginForm.reset()
    registerForm.reset()
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background 
      <div className="absolute inset-0 pointer-events-none -z-10">
        <DarkVeil resolutionScale={1} />
      </div>*/}

      {/* Contenido encima del background */}
      <div className="relative grid min-h-screen place-items-center">
        <Card className="w-full max-w-sm bg-background/80 backdrop-blur">
          <CardHeader>
            <CardTitle>{isRegisterMode ? 'Registrarse' : 'Iniciar sesión'}</CardTitle>
          </CardHeader>
          <CardContent>
            {!isRegisterMode ? (
              // Formulario de Login
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="tu@correo.com" 
                            type="email"
                            autoComplete="username"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            autoComplete="current-password"
                            {...field} 
                          />
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
            ) : (
              // Formulario de Registro
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="registerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="tu@correo.com" 
                            type="email"
                            autoComplete="username"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="registerPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            autoComplete="new-password"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar contraseña</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            autoComplete="new-password"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button className="w-full text-white bg-black hover:bg-black/80" type="submit">
                    Registrarse
                  </Button>
                </form>
              </Form>
            )}

            {/* Botón para cambiar entre Login y Registro */}
            <div className="mt-4 text-center">
              <Button
                variant="link"
                type="button"
                onClick={handleModeChange}
                className="text-sm"
              >
                {isRegisterMode 
                  ? '¿Ya tienes cuenta? Inicia sesión' 
                  : '¿No tienes cuenta? Regístrate'}
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              {isRegisterMode 
                ? 'Crea tu cuenta para comenzar.' 
                : 'Usa tu usuario admin para acceder al panel.'}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}