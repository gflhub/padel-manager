'use server'

import { requireUser } from '@/lib/auth/session'
import { requireGlobalAdmin } from '@/lib/auth/authorization'
import * as clubRepo from '@/lib/repositories/clubs'

export async function getClubsOverview() {
    try {
        const user = await requireUser()
        const isAdmin = await requireGlobalAdmin(user.id)
        if (!isAdmin) {
            return { error: 'Acesso restrito a administradores da plataforma', data: null }
        }

        return clubRepo.getAllClubsOverview()
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao buscar clubes'
        return { error: message, data: null }
    }
}
