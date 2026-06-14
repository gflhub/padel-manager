import { prisma } from '@/lib/db/prisma'
import { getCurrentUser } from '@/lib/auth/session'
import { getClubContext } from '@/lib/get-club-role'
import { getClubTrialStatus } from '@/lib/club-trial'

export async function getIsTrialReadOnly(): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user?.profileId) return false

  const ctx = await getClubContext(user.profileId)
  if (!ctx) return false

  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { trialEndsAt: true },
  })

  if (!club) return false

  return getClubTrialStatus(club).status === 'expired'
}
