'use server'

import { requireUser, requireClubContext } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import * as comandaRepo from '@/lib/repositories/comandas'
import { assertClubWritable } from '@/lib/club-trial'

export async function getComandas(status?: string) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        return comandaRepo.getComandasByClub(context.clubId, status)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao buscar comandas'
        return { error: message, data: null }
    }
}

export async function getComandaWithItems(id: string) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        return comandaRepo.getComandaWithItems(id, context.clubId)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao buscar comanda'
        return { error: message, data: null }
    }
}

export async function createComanda(formData: FormData) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        await assertClubWritable(context.clubId)

        const customer_name = (formData.get('customer_name') as string)?.trim()
        if (!customer_name) return { error: 'Nome do cliente é obrigatório' }

        const customerPhone = formData.get('customer_phone') as string | null
        const notes = customerPhone ? `Tel: ${customerPhone}` : undefined

        const result = await comandaRepo.createComanda(
            context.clubId,
            customer_name,
            user.id,
            notes
        )

        if (result.error) return { error: result.error }
        revalidatePath('/admin/comandas')
        return { data: result.data, error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao criar comanda'
        return { error: message }
    }
}

export async function addComandaItem(comandaId: string, formData: FormData) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        await assertClubWritable(context.clubId)

        const unit_price = Number(formData.get('unit_price'))
        const quantity = Number(formData.get('quantity')) || 1
        const product_id = (formData.get('product_id') as string) || undefined
        const name = formData.get('product_name') as string

        const result = await comandaRepo.addComandaItem(
            comandaId,
            name,
            quantity,
            unit_price,
            product_id
        )

        if (result.error) return { error: result.error }

        revalidatePath('/admin/comandas')
        return { data: result.data, error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao adicionar item'
        return { error: message }
    }
}

export async function closeComanda(id: string, paymentMethod: string) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        await assertClubWritable(context.clubId)

        if (!paymentMethod || paymentMethod.trim() === '') {
            return { error: 'Método de pagamento é obrigatório' }
        }

        const result = await comandaRepo.closeComanda(
            id,
            context.clubId,
            paymentMethod,
            context.userId
        )

        if (result.error) return { error: result.error }
        revalidatePath('/admin/comandas')
        return { error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao fechar comanda'
        return { error: message }
    }
}

export async function closeMultipleComandas(ids: string[], paymentMethod: string) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        await assertClubWritable(context.clubId)

        if (!ids || ids.length === 0) return { error: 'Nenhuma comanda selecionada' }

        if (!paymentMethod || paymentMethod.trim() === '') {
            return { error: 'Método de pagamento é obrigatório' }
        }

        for (const id of ids) {
            const result = await comandaRepo.closeComanda(id, context.clubId, paymentMethod, context.userId)
            if (result.error) return { error: result.error }
        }

        revalidatePath('/admin/comandas')
        return { error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao fechar comandas'
        return { error: message }
    }
}

export async function updateComandaItemQuantity(itemId: string, newQuantity: number) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        await assertClubWritable(context.clubId)

        const result = await comandaRepo.updateComandaItemQuantity(itemId, newQuantity)
        if (result.error) return { error: result.error }

        revalidatePath('/admin/comandas')
        return { error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao atualizar quantidade'
        return { error: message }
    }
}

export async function cancelComanda(id: string) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        await assertClubWritable(context.clubId)

        const result = await comandaRepo.cancelComanda(id, context.clubId, context.userId)
        if (result.error) return { error: result.error }

        revalidatePath('/admin/comandas')
        return { error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao cancelar comanda'
        return { error: message }
    }
}
