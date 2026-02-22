'use client'

import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import DarkVeil from '@/components/DarkVeil'
import Link from 'next/link'
import { ArrowLeft, KeyRound, Eye, EyeOff } from 'lucide-react'

const updatePasswordSchema = z.object({
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string().min(6, 'Mínimo 6 caracteres'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
})

export default function UpdatePasswordPage() {
    const { toast } = useToast()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const form = useForm<z.infer<typeof updatePasswordSchema>>({
        resolver: zodResolver(updatePasswordSchema),
        defaultValues: { password: '', confirmPassword: '' },
    })

    async function onSubmit(values: z.infer<typeof updatePasswordSchema>) {
        setIsLoading(true)
        const supa = supabaseBrowser()

        const { error } = await supa.auth.updateUser({
            password: values.password
        })

        setIsLoading(false)

        if (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' })
            return
        }

        toast({ title: 'Contraseña actualizada', description: 'Tu contraseña ha sido cambiada exitosamente.' })
        router.replace('/customer')
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

            {/* Contenido */}
            <div className="relative grid min-h-screen place-items-center p-4">
                <Card className="w-full max-w-sm bg-background/80 backdrop-blur shadow-xl border-muted/20">
                    <CardHeader>
                        <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4">
                            <KeyRound className="w-10 h-10 text-primary" />
                        </div>
                        <CardTitle className="text-2xl text-center">Nueva Contraseña</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nueva Contraseña</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type={showPassword ? 'text' : 'password'}
                                                        autoComplete="new-password"
                                                        placeholder="Escribe tu nueva contraseña"
                                                        className="pr-10"
                                                        {...field}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword((prev) => !prev)}
                                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-r-md"
                                                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                                        aria-pressed={showPassword}
                                                    >
                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Confirmar Contraseña</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type={showConfirmPassword ? 'text' : 'password'}
                                                        autoComplete="new-password"
                                                        placeholder="Repite tu nueva contraseña"
                                                        className="pr-10"
                                                        {...field}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-r-md"
                                                        aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                                        aria-pressed={showConfirmPassword}
                                                    >
                                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button className="w-full" type="submit" disabled={isLoading}>
                                    {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
