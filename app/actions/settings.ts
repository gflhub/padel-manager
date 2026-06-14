'use server'

import { requireUser, requireClubContext } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import * as settingsRepo from '@/lib/repositories/settings'
import { assertClubWritable } from '@/lib/club-trial'

const complexInfoSchema = z.object({
    complex_name: z.string().min(1, 'Nome é obrigatório'),
    address: z.string().optional().default(''),
    phone: z.string().optional().default(''),
    email: z.string().email('Email inválido').or(z.literal('')).optional().default(''),
})

const reservationSettingsSchema = z.object({
    max_advance_days: z.coerce.number().int().min(1).max(365),
    default_slot_duration: z.coerce.number().int().min(15).max(480),
})

const paymentSettingsSchema = z.object({
    pix_key: z.string().optional().default(''),
})

export async function getSettings() {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        return settingsRepo.getClubSettings(context.clubId)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao buscar configurações'
        return { error: message, data: null }
    }
}

export async function updateComplexInfo(formData: FormData): Promise<void> {
    const user = await requireUser()
    const context = await requireClubContext(user.id)
    await assertClubWritable(context.clubId)

    const raw = {
        complex_name: formData.get('complex_name') as string,
        address: formData.get('address') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
    }

    const parsed = complexInfoSchema.parse(raw)

    await settingsRepo.updateClubComplexInfo(context.clubId, user.id, {
        name: parsed.complex_name,
        address: parsed.address,
        phone: parsed.phone,
        email: parsed.email,
    })

    revalidatePath('/admin/settings')
}

export async function updateReservationSettings(formData: FormData): Promise<void> {
    const user = await requireUser()
    const context = await requireClubContext(user.id)
    await assertClubWritable(context.clubId)

    const parsed = reservationSettingsSchema.parse({
        max_advance_days: formData.get('max_advance_days'),
        default_slot_duration: formData.get('default_slot_duration'),
    })

    await settingsRepo.updateClubReservationSettings(context.clubId, user.id, {
        maxAdvanceDays: parsed.max_advance_days,
        defaultSlotDuration: parsed.default_slot_duration,
    })

    revalidatePath('/admin/settings')
}

export async function updatePaymentSettings(formData: FormData): Promise<void> {
    const user = await requireUser()
    const context = await requireClubContext(user.id)
    await assertClubWritable(context.clubId)

    const parsed = paymentSettingsSchema.parse({
        pix_key: formData.get('pix_key'),
    })

    await settingsRepo.updateClubPaymentSettings(context.clubId, user.id, {
        pixKey: parsed.pix_key,
    })

    revalidatePath('/admin/settings')
}
