import { supabaseServer } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ProfileForm from './profile-form'

export default async function ProfilePage() {
    const supa = await supabaseServer()
    const { data: { user } } = await supa.auth.getUser()

    if (!user) return null

    const { data: profile } = await supa
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Mi Perfil</h1>
                <p className="text-muted-foreground">Gestiona tu información personal.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Información de la Cuenta</CardTitle>
                    <CardDescription>
                        Actualiza tu nombre y visualiza tu correo electrónico.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ProfileForm user={user} profile={profile} />
                </CardContent>
            </Card>
        </div>
    )
}
