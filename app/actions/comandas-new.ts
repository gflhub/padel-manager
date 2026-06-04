'use server'

import { requireUser, requireClubContext } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import * as comandaRepo from '@/lib/repositories/comandas'

export async function updateComandaItemQuantity(itemId: string, newQuantity: number) {
    try {
        const user = await requireUser()
        await requireClubContext(user.id)

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

        const result = await comandaRepo.cancelComanda(id, context.clubId, context.userId)
        if (result.error) return { error: result.error }

        revalidatePath('/admin/comandas')
        return { error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao cancelar comanda'
        return { error: message }
    }
}
