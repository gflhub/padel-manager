import { prisma } from '@/lib/db/prisma'
import { sendEmail } from '@/lib/email'

const DAY_MS = 24 * 60 * 60 * 1000

/** Default number of days before nextDueDate to send a warning email. */
const DUE_WARNING_DAYS = Number(process.env.SUBSCRIPTION_DUE_WARNING_DAYS ?? '3')

/**
 * Send a due-date warning email to monthly members whose nextDueDate falls
 * within DUE_WARNING_DAYS, for a given club. Each member is warned only once
 * per due cycle (tracked via dueWarningEmailSentAt).
 * @param clubId - Club ID
 */
export async function sendSubscriptionDueWarnings(clubId: string): Promise<void> {
    const now = new Date()
    const warningThreshold = new Date(now.getTime() + DUE_WARNING_DAYS * DAY_MS)

    const subscriptions = await prisma.subscription.findMany({
        where: {
            clubId,
            status: 'ACTIVE',
            nextDueDate: { lte: warningThreshold },
        },
        include: { user: { include: { profile: { select: { name: true, email: true } } } } },
    })

    for (const subscription of subscriptions) {
        if (
            subscription.dueWarningEmailSentAt &&
            subscription.dueWarningEmailSentAt > new Date(subscription.nextDueDate.getTime() - DUE_WARNING_DAYS * DAY_MS - DAY_MS)
        ) {
            continue
        }

        const profile = subscription.user.profile
        if (!profile?.email) continue

        const dueDate = subscription.nextDueDate.toISOString().split('T')[0]

        await sendEmail({
            to: profile.email,
            subject: 'Sua mensalidade está próxima do vencimento',
            body: `Olá ${profile.name},\n\nSua mensalidade do plano "${subscription.planName}" vence em ${dueDate}.\n\nEquipe Padel Manager`,
        })

        await prisma.subscription.update({
            where: { id: subscription.id },
            data: { dueWarningEmailSentAt: now },
        })
    }
}
