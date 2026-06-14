import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { requireGlobalAdmin } from '@/lib/auth/authorization'
import { getClubsOverview } from '@/app/actions/clubs'
import ClubsClient from './clubs-client'

export default async function AdminClubsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const isAdmin = await requireGlobalAdmin(user.id)
    if (!isAdmin) redirect('/dashboard')

    const { data: clubs } = await getClubsOverview()

    return <ClubsClient clubs={clubs || []} />
}
