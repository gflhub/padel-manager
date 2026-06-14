import { getCurrentUser } from '@/lib/auth/session'
import { getClubContext } from '@/lib/get-club-role'
import { redirect } from 'next/navigation'

export default async function RootPage() {
    const user = await getCurrentUser()

    if (!user || !user.profileId) {
        redirect('/login')
    }

    // Se for staff de algum clube → área administrativa
    const clubCtx = await getClubContext(user.profileId)
    if (clubCtx) {
        redirect('/dashboard')
    }

    // Caso contrário → área do cliente
    redirect('/home')
}
