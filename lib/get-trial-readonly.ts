import { prisma } from '@/lib/db/prisma'
import { getCurrentUser, requireClubContext } from '@/lib/auth/session'
import { getClubTrialStatus } from '@/lib/club-trial'

export async function getIsTrialReadOnly(): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  let ctx: { clubId: string; role: string; userId: string }
  try {
    ctx = await requireClubContext(user.id)
  } catch {
    return false
  }

  const club = await prisma.club.findUnique({
    where: { id: ctx.clubId },
    select: { trialEndsAt: true },
  })

  if (!club) return false

  return getClubTrialStatus(club).status === 'expired'
}
