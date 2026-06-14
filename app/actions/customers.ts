'use server'

import { requireUser, requireClubContext } from '@/lib/auth/session'
import { assertClubWritable } from '@/lib/club-trial'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import * as userRepo from '@/lib/repositories/users'

const memberSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Email obrigatório e deve ser válido'),
    phone: z.string().optional().nullable(),
    cpf: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
})

export async function getCustomers() {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        return userRepo.getClubMembers(context.clubId)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao buscar membros'
        return { error: message, data: null }
    }
}

export async function createCustomer(formData: FormData) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        await assertClubWritable(context.clubId)

        const raw = {
            name: (formData.get('name') as string)?.trim(),
            email: (formData.get('email') as string)?.toLowerCase().trim() || undefined,
            phone: (formData.get('phone') as string) || undefined,
            cpf: (formData.get('cpf') as string)?.replace(/\D/g, '') || undefined,
            notes: (formData.get('notes') as string) || undefined,
        }

        const parsed = memberSchema.safeParse(raw)
        if (!parsed.success) return { error: parsed.error.issues[0].message }

        const result = await userRepo.createClubMember(
            context.clubId,
            parsed.data.name,
            parsed.data.email || undefined,
            parsed.data.phone || undefined,
            parsed.data.cpf || undefined,
            undefined,
            parsed.data.notes || undefined
        )

        if (result.error) {
            return { error: result.error }
        }

        revalidatePath('/admin/customers')
        return {
            data: result.data,
            error: null,
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao criar cliente'
        return { error: message }
    }
}

export async function updateCustomer(id: string, formData: FormData) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        await assertClubWritable(context.clubId)

        const raw = {
            name: (formData.get('name') as string)?.trim(),
            phone: (formData.get('phone') as string) || undefined,
            notes: (formData.get('notes') as string) || undefined,
            cpf: (formData.get('cpf') as string)?.replace(/\D/g, '') || undefined,
            email: (formData.get('email') as string)?.toLowerCase().trim() || undefined,
        }

        const result = await userRepo.updateClubMember(id, context.clubId, raw)
        if (result.error) return { error: result.error }

        revalidatePath('/admin/customers')
        return { data: result.data, error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao atualizar cliente'
        return { error: message }
    }
}

export async function toggleCustomerActive(id: string, active: boolean) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        await assertClubWritable(context.clubId)

        const result = await userRepo.toggleClubMemberActive(id, context.clubId, active)
        if (result.error) return { error: result.error }

        revalidatePath('/admin/customers')
        return { error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao atualizar cliente'
        return { error: message }
    }
}
