import { supabaseServer } from '@/lib/supabase/server'
import AddressesList from './addresses-list'

export default async function AddressesPage() {
    const supa = await supabaseServer()
    const { data: { user } } = await supa.auth.getUser()

    if (!user) return null

    const { data: addresses } = await supa
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Direcciones</h1>
                <p className="text-muted-foreground">Gestiona tus direcciones de envío.</p>
            </div>

            <AddressesList userId={user.id} addresses={addresses || []} />
        </div>
    )
}
