'use server'

import { requireUser, requireClubContext } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import * as courtRepo from '@/lib/repositories/courts'
import { assertClubWritable } from '@/lib/club-trial'

const courtSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    court_type: z.enum(['padel', 'tennis', 'beach_tennis', 'volleyball', 'futsal', 'squash', 'other']),
    price_per_slot: z.coerce.number().min(0),
    duration_slot: z.coerce.number().min(30),
    active: z.boolean().optional().default(true),
})

export async function getActiveCourts() {
    return courtRepo.getActiveCourts()
}

export async function getCourts() {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        return courtRepo.getCourtsByClub(context.clubId)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao buscar quadras'
        return { error: message, data: null }
    }
}

export async function createCourt(formData: FormData) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        await assertClubWritable(context.clubId)

        const raw = {
            name: formData.get('name') as string,
            court_type: formData.get('court_type') as string,
            price_per_slot: formData.get('price_per_slot'),
            duration_slot: formData.get('duration_slot'),
            active: formData.get('active') === 'true',
        }
        const parsed = courtSchema.safeParse(raw)
        if (!parsed.success) return { error: parsed.error.issues[0].message }

        const result = await courtRepo.createCourt(
            context.clubId,
            parsed.data.name,
            parsed.data.court_type as 'padel' | 'tennis' | 'beach_tennis' | 'volleyball' | 'futsal' | 'squash' | 'other',
            parsed.data.price_per_slot,
            parsed.data.duration_slot,
            parsed.data.active
        )

        if (result.error) return { error: result.error }
        revalidatePath('/admin/courts')
        revalidatePath('/')
        return { data: result.data, error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao criar quadra'
        return { error: message }
    }
}

export async function updateCourt(id: string, formData: FormData) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        await assertClubWritable(context.clubId)

        const raw = {
            name: formData.get('name') as string,
            court_type: formData.get('court_type') as string,
            price_per_slot: formData.get('price_per_slot'),
            duration_slot: formData.get('duration_slot'),
            active: formData.get('active') === 'true',
        }
        const parsed = courtSchema.safeParse(raw)
        if (!parsed.success) return { error: parsed.error.issues[0].message }

        const result = await courtRepo.updateCourt(
            id,
            context.clubId,
            {
                name: parsed.data.name,
                court_type: parsed.data.court_type as 'padel' | 'tennis' | 'beach_tennis' | 'volleyball' | 'futsal' | 'squash' | 'other',
                price_per_slot: parsed.data.price_per_slot,
                duration_slot: parsed.data.duration_slot,
                active: parsed.data.active,
            }
        )

        if (result.error) return { error: result.error }
        revalidatePath('/admin/courts')
        revalidatePath('/')
        return { data: result.data, error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao atualizar quadra'
        return { error: message }
    }
}

export async function deleteCourt(id: string) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        await assertClubWritable(context.clubId)

        const result = await courtRepo.deleteCourt(id, context.clubId)
        if (result.error) return { error: result.error }

        revalidatePath('/admin/courts')
        return { error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao deletar quadra'
        return { error: message }
    }
}
