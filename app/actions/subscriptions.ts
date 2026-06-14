'use server'

import { requireUser, requireClubContext } from '@/lib/auth/session'
import { assertClubWritable } from '@/lib/club-trial'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import * as subscriptionRepo from '@/lib/repositories/subscriptions'

const createSubscriptionSchema = z.object({
    member_id: z.string().min(1, 'Selecione um cliente'),
    plan_name: z.string().min(1, 'Nome do plano é obrigatório'),
    price: z.coerce.number().positive('Valor deve ser maior que zero'),
    due_day: z.coerce.number().int().min(1, 'Dia inválido').max(28, 'Use um dia entre 1 e 28'),
})

function nextDueDateFromDay(dueDay: number): string {
    const now = new Date()
    let date = new Date(now.getFullYear(), now.getMonth(), dueDay)
    if (date < now) {
        date = new Date(now.getFullYear(), now.getMonth() + 1, dueDay)
    }
    return date.toISOString().split('T')[0]
}

export async function getSubscriptions() {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        return subscriptionRepo.getSubscriptionsByClub(context.clubId)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao buscar mensalistas'
        return { error: message, data: null }
    }
}

export async function createSubscription(formData: FormData) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        await assertClubWritable(context.clubId)

        const parsed = createSubscriptionSchema.safeParse({
            member_id: formData.get('member_id'),
            plan_name: formData.get('plan_name'),
            price: formData.get('price'),
            due_day: formData.get('due_day'),
        })

        if (!parsed.success) {
            return { error: parsed.error.issues[0].message, data: null }
        }

        // Resolve User ID from the club member's profile
        const clubStaff = await prisma.clubStaff.findUnique({
            where: { id: parsed.data.member_id },
            include: { profile: { select: { userId: true } } },
        })

        if (!clubStaff || clubStaff.clubId !== context.clubId) {
            return { error: 'Cliente não encontrado', data: null }
        }

        const nextDueDate = nextDueDateFromDay(parsed.data.due_day)

        const result = await subscriptionRepo.createSubscription(
            context.clubId,
            clubStaff.profile.userId,
            parsed.data.plan_name,
            parsed.data.price,
            parsed.data.due_day,
            nextDueDate
        )

        if (result.error) return { error: result.error, data: null }

        revalidatePath('/admin/members')
        return { data: result.data, error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao cadastrar mensalista'
        return { error: message, data: null }
    }
}

export async function markSubscriptionPaid(subscriptionId: string) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        await assertClubWritable(context.clubId)

        const result = await subscriptionRepo.markSubscriptionPaid(subscriptionId, context.clubId)
        if (result.error) return { error: result.error }

        revalidatePath('/admin/members')
        return { error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao registrar pagamento'
        return { error: message }
    }
}

export async function cancelSubscription(subscriptionId: string) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        await assertClubWritable(context.clubId)

        const result = await subscriptionRepo.cancelSubscription(subscriptionId, context.clubId)
        if (result.error) return { error: result.error }

        revalidatePath('/admin/members')
        return { error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao cancelar mensalista'
        return { error: message }
    }
}
