import { getCurrentUser, requireClubContext } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

export default async function RootPage() {
    const user = await getCurrentUser()

    if (!user || !user.profileId) {
        redirect('/login')
    }

    try {
        await requireClubContext(user.id)
        redirect('/dashboard')
    } catch {
        redirect('/home')
    }
}
