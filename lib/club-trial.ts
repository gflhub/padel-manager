import { prisma } from '@/lib/db/prisma'
import { sendEmail } from '@/lib/email'

const DAY_MS = 24 * 60 * 60 * 1000

export type ClubTrialStatus = 'active' | 'warning' | 'expired' | 'none'

export interface ClubTrialInfo {
  status: ClubTrialStatus
  daysRemaining: number | null
}

export function getClubTrialStatus(club: { trialEndsAt: Date | null }): ClubTrialInfo {
  if (!club.trialEndsAt) {
    return { status: 'none', daysRemaining: null }
  }

  const msRemaining = club.trialEndsAt.getTime() - Date.now()

  if (msRemaining <= 0) {
    return { status: 'expired', daysRemaining: 0 }
  }

  const daysRemaining = Math.ceil(msRemaining / DAY_MS)

  if (daysRemaining <= 5) {
    return { status: 'warning', daysRemaining }
  }

  return { status: 'active', daysRemaining }
}

export class ClubTrialExpiredError extends Error {
  constructor() {
    super('O período de teste deste clube expirou. Ações de edição estão desabilitadas.')
    this.name = 'ClubTrialExpiredError'
  }
}

export async function sendTrialWarningEmailIfNeeded(club: {
  id: string
  name: string
  trialEndsAt: Date | null
  trialWarningEmailSentAt: Date | null
}): Promise<void> {
  if (club.trialWarningEmailSentAt) {
    return
  }

  const { status, daysRemaining } = getClubTrialStatus(club)

  if (status !== 'warning') {
    return
  }

  const owners = await prisma.clubStaff.findMany({
    where: { clubId: club.id, role: 'OWNER', active: true },
    include: { profile: true },
  })

  await Promise.all(
    owners.map((owner) =>
      sendEmail({
        to: owner.profile.email,
        subject: `O período de teste do clube ${club.name} está terminando`,
        body: `Olá ${owner.profile.name},\n\nO período de teste do clube "${club.name}" termina em ${daysRemaining} dia(s). Após o vencimento, ações de edição ficarão bloqueadas até a contratação de um plano.\n\nEquipe Padel Manager`,
      })
    )
  )

  await prisma.club.update({
    where: { id: club.id },
    data: { trialWarningEmailSentAt: new Date() },
  })
}

export async function assertClubWritable(clubId: string): Promise<void> {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { trialEndsAt: true },
  })

  if (!club) {
    throw new Error('Clube não encontrado')
  }

  const { status } = getClubTrialStatus(club)

  if (status === 'expired') {
    throw new ClubTrialExpiredError()
  }
}
