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
import Link from 'next/link'
import { ArrowLeft, MailCheck, KeyRound } from 'lucide-react'

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

const recoverySchema = z.object({
  email: z.string().email('Correo inválido'),
})

export default function LoginPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [recoverySuccess, setRecoverySuccess] = useState(false)

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { registerEmail: '', registerPassword: '', confirmPassword: '' },
  })

  const recoveryForm = useForm<z.infer<typeof recoverySchema>>({
    resolver: zodResolver(recoverySchema),
    defaultValues: { email: '' },
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

    const destination = role === 'admin' ? '/admin' : '/customer'
    toast({ title: 'Bienvenido', description: 'Sesión iniciada' })
    router.replace(destination)
  }

  async function onRegister(values: z.infer<typeof registerSchema>) {
    const supa = supabaseBrowser()
    const { data, error } = await supa.auth.signUp({
      email: values.registerEmail,
      password: values.registerPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return
    }

    setRegistrationSuccess(true)
    registerForm.reset()
  }

  async function onRecovery(values: z.infer<typeof recoverySchema>) {
    const supa = supabaseBrowser()
    const nextPath = '/auth/update-password'
    const { error } = await supa.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return
    }

    setRecoverySuccess(true)
    recoveryForm.reset()
  }

  function handleModeChange() {
    setIsRegisterMode(!isRegisterMode)
    setIsRecoveryMode(false)
    setRegistrationSuccess(false)
    setRecoverySuccess(false)
    loginForm.reset()
    registerForm.reset()
    recoveryForm.reset()
  }

  if (registrationSuccess) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 pointer-events-none -z-10">
          <DarkVeil resolutionScale={1} />
        </div>
        <div className="relative grid min-h-screen place-items-center p-4">
          <Card className="w-full max-w-sm bg-background/80 backdrop-blur shadow-xl border-muted/20 text-center">
            <CardHeader>
              <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4">
                <MailCheck className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">¡Registro Exitoso!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Hemos enviado un enlace de confirmación a tu correo electrónico.
              </p>
              <p className="text-sm font-medium">
                Por favor revisa tu bandeja de entrada (y spam) para activar tu cuenta.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                className="w-full"
                onClick={() => {
                  setRegistrationSuccess(false)
                  setIsRegisterMode(false)
                }}
              >
                Volver a Iniciar Sesión
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  if (recoverySuccess) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 pointer-events-none -z-10">
          <DarkVeil resolutionScale={1} />
        </div>
        <div className="relative grid min-h-screen place-items-center p-4">
          <Card className="w-full max-w-sm bg-background/80 backdrop-blur shadow-xl border-muted/20 text-center">
            <CardHeader>
              <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4">
                <MailCheck className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">¡Correo Enviado!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Hemos enviado las instrucciones para recuperar tu contraseña a tu correo.
              </p>
              <p className="text-sm font-medium">
                Revisa tu bandeja de entrada (y spam).
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                className="w-full"
                onClick={() => {
                  setRecoverySuccess(false)
                  setIsRecoveryMode(false)
                }}
              >
                Volver a Iniciar Sesión
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <DarkVeil resolutionScale={1} />
      </div>

      {/* Back Button */}
      <div className="absolute top-4 left-4 z-10">
        <Button asChild variant="ghost" className="gap-2 bg-white hover:bg-background/50">
          <Link href="/">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </Button>
      </div>

      {/* Contenido encima del background */}
      <div className="relative grid min-h-screen place-items-center p-4">
        <Card className="w-full max-w-sm bg-background/80 backdrop-blur shadow-xl border-muted/20">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {isRecoveryMode
                ? 'Recuperar Contraseña'
                : isRegisterMode
                  ? 'Crear Cuenta'
                  : 'Iniciar Sesión'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isRecoveryMode ? (
              // Formulario de Recuperación
              <Form {...recoveryForm} key="recovery-form">
                <form onSubmit={recoveryForm.handleSubmit(onRecovery)} className="space-y-4">
                  <FormField
                    control={recoveryForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="tu@correo.com"
                            type="email"
                            autoComplete="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button className="w-full" type="submit">
                    Enviar instrucciones
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    type="button"
                    onClick={() => setIsRecoveryMode(false)}
                  >
                    Cancelar
                  </Button>
                </form>
              </Form>
            ) : !isRegisterMode ? (
              // Formulario de Login
              <Form {...loginForm} key="login-form">
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
                  <div className="text-right">
                    <Button
                      variant="link"
                      className="px-0 font-normal h-auto text-xs text-muted-foreground hover:text-primary"
                      type="button"
                      onClick={() => setIsRecoveryMode(true)}
                    >
                      ¿Olvidaste tu contraseña?
                    </Button>
                  </div>
                  <Button className="w-full" type="submit">
                    Entrar
                  </Button>
                </form>
              </Form>
            ) : (
              // Formulario de Registro
              <Form {...registerForm} key="register-form">
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
                  <Button className="w-full" type="submit">
                    Registrarse
                  </Button>
                </form>
              </Form>
            )}

            {/* Botón para cambiar entre Login y Registro */}
            {!isRecoveryMode && (
              <div className="mt-6 text-center">
                <Button
                  variant="link"
                  type="button"
                  onClick={handleModeChange}
                  className="text-sm text-muted-foreground hover:text-black/50"
                >
                  {isRegisterMode
                    ? '¿Ya tienes cuenta? Inicia sesión'
                    : '¿No tienes cuenta? Regístrate'}
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-xs text-muted-foreground text-center">
              {isRecoveryMode
                ? 'Te enviaremos un enlace seguro para restablecerla.'
                : isRegisterMode
                  ? 'Al registrarte aceptas nuestros términos y condiciones.'
                  : 'Acceso seguro para clientes y administradores.'}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}