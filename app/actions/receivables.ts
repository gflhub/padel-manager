'use server'

import { requireUser, requireClubContext } from '@/lib/auth/session'
import { assertClubWritable } from '@/lib/club-trial'
import { revalidatePath } from 'next/cache'
import { PaymentMethod } from '@/lib/generated/prisma/enums'
import * as receivablesRepo from '@/lib/repositories/receivables'

export async function getReceivables() {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        return receivablesRepo.getReceivablesByCustomer(context.clubId)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao buscar recebíveis'
        return { data: null, error: message }
    }
}

export async function getCustomerReceivables(customerProfileId: string) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        return receivablesRepo.getCustomerReceivables(context.clubId, customerProfileId)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao buscar recebíveis do cliente'
        return { data: null, error: message }
    }
}

const VALID_METHODS = new Set<string>(Object.values(PaymentMethod))

export async function settleCustomer(customerProfileId: string, method: PaymentMethod) {
    try {
        if (!VALID_METHODS.has(method)) return { data: null, error: 'Forma de pagamento inválida' }
        const user = await requireUser()
        if (!user.profileId) return { data: null, error: 'Usuário sem perfil associado' }
        const context = await requireClubContext(user.id)
        await assertClubWritable(context.clubId)
        const result = await receivablesRepo.settleCustomerReceivables(
            context.clubId,
            customerProfileId,
            method,
            user.profileId
        )
        if (result.error) return { data: null, error: result.error }
        revalidatePath('/admin/receivables')
        return { data: result.data, error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao quitar recebíveis'
        return { data: null, error: message }
    }
}
