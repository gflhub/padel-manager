'use server'

import { requireUser, requireClubContext } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import * as reservationRepo from '@/lib/repositories/reservations'
import * as courtRepo from '@/lib/repositories/courts'

function timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const reservationSchema = z.object({
    court_id: z.string().min(1),
    date: z.string(),
    start_time: z.string(),
    duration: z.coerce.number().min(30),
    players: z.array(z.object({ name: z.string().min(1) })).min(0),
})

export async function getReservations(filters?: { date?: string; status?: string; court_id?: string }) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        return reservationRepo.getReservationsByClub(context.clubId, filters)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao buscar reservas'
        return { error: message, data: null }
    }
}

// ─────────────────────────────────────────────────────────────
// Fluxo secundário assíncrono: garante que o cliente está associado
// ao clube no momento da reserva. Idempotente — ignoreDuplicates.
// ─────────────────────────────────────────────────────────────
async function ensureClubMembership(profileId: string, clubId: string) {
    const service = createServiceClient()
    await service
        .from('club_members')
        .upsert(
            { club_id: clubId, profile_id: profileId, active: true },
            { onConflict: 'club_id,profile_id', ignoreDuplicates: true }
        )
}

export async function createReservation(formData: FormData) {
    try {
        const user = await requireUser()

        const raw = {
            court_id: formData.get('court_id') as string,
            date: formData.get('date') as string,
            start_time: formData.get('start_time') as string,
            duration: formData.get('duration'),
            players: JSON.parse(formData.get('players') as string || '[]'),
        }

        const parsed = reservationSchema.safeParse(raw)
        if (!parsed.success) return { error: parsed.error.issues[0].message }

        // calculate end_time
        const totalMin = timeToMinutes(parsed.data.start_time) + parsed.data.duration
        const end_time = minutesToTime(totalMin)

        // get court price and club_id from repository
        const courtResult = await courtRepo.getCourtById(parsed.data.court_id, '')
        if (courtResult.error || !courtResult.data) return { error: 'Quadra não encontrada' }
        const court = courtResult.data

        // Check for overlaps
        const overlapResult = await reservationRepo.checkReservationOverlap(
            parsed.data.court_id,
            parsed.data.date,
            parsed.data.start_time,
            end_time
        )
        if (overlapResult.error) return { error: overlapResult.error }
        if (overlapResult.hasOverlap) return { error: 'Horário indisponível: conflito com outra reserva' }

        const total_price = court.price_per_slot
        const price_per_player = total_price / (parsed.data.players.length || 1)

        const result = await reservationRepo.createReservation(
            user.id,
            court.club_id,
            parsed.data.court_id,
            parsed.data.date,
            parsed.data.start_time,
            end_time,
            parsed.data.duration,
            parsed.data.players,
            total_price,
            price_per_player
        )

        if (result.error) return { error: result.error }
        revalidatePath('/reservations')
        revalidatePath('/admin/reservations')
        return { data: result.data, error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao criar reserva'
        return { error: message }
    }
}

export async function updateReservationStatus(id: string, status: string) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)

        const result = await reservationRepo.updateReservationStatus(id, context.clubId, status)
        if (result.error) return { error: result.error }

        revalidatePath('/reservations')
        revalidatePath('/admin/reservations')
        return { error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao atualizar reserva'
        return { error: message }
    }
}

export async function cancelOwnReservation(id: string) {
    try {
        const user = await requireUser()

        const result = await reservationRepo.cancelUserReservation(id, user.id)
        if (result.error) return { error: result.error }

        revalidatePath('/reservations')
        return { error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao cancelar reserva'
        return { error: message }
    }
}

export async function rescheduleOwnReservation(id: string, newDate: string, newStartTime: string, duration: number) {
    try {
        const user = await requireUser()

        const result = await reservationRepo.rescheduleUserReservation(id, user.id, newDate, newStartTime, duration)
        if (result.error) return { error: result.error }

        revalidatePath('/reservations')
        return { error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao reagendar reserva'
        return { error: message }
    }
}

export async function getAvailableCourts() {
    try {
        await requireUser()
        return courtRepo.getActiveCourts()
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao buscar quadras'
        return { error: message, data: null }
    }
}

export async function getBookedSlots(courtId: string, date: string) {
    try {
        return await reservationRepo.getBookedSlots(courtId, date)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao buscar horários ocupados'
        return { error: message, data: null }
    }
}
