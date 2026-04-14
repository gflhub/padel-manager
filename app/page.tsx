import { createClient } from '@/lib/supabase/server'
import { getClubContext } from '@/lib/get-club-role'
import { redirect } from 'next/navigation'

export default async function RootPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Se for staff de algum clube → área administrativa
    const clubCtx = await getClubContext(user.id)
    if (clubCtx) {
        redirect('/dashboard')
    }

    // Caso contrário → área do cliente
    redirect('/home')
}
