'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getClubContext } from '@/lib/get-club-role'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

async function assertStaffContext() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ctx: null, error: 'Não autorizado' as const }
    const ctx = await getClubContext(user.id)
    if (!ctx) return { ctx: null, error: 'Sem permissão' as const }
    return { ctx: { ...ctx, userId: user.id }, error: null }
}

const reservationSchema = z.object({
    court_id: z.string().min(1),
    date: z.string(),
    start_time: z.string(),
    duration: z.coerce.number().min(30),
    players: z.array(z.object({ name: z.string().min(1) })).min(0),
})

export async function getReservations(filters?: { date?: string; status?: string; court_id?: string }) {
    const { ctx, error: permError } = await assertStaffContext()
    if (permError || !ctx) return { error: permError ?? 'Erro', data: null }
    const service = createServiceClient()
    let query = service
        .from('reservations')
        .select('*, court:courts(id, name, court_type)')
        .eq('club_id', ctx.clubId)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })

    if (filters?.date) query = query.eq('date', filters.date)
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.court_id) query = query.eq('court_id', filters.court_id)

    const { data, error } = await query
    if (error) return { error: error.message, data: null }
    return { data, error: null }
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autorizado' }

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
    const [hours, minutes] = parsed.data.start_time.split(':').map(Number)
    const totalMin = hours * 60 + minutes + parsed.data.duration
    const end_time = `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`

    // get court price and club_id
    const service = createServiceClient()
    const { data: court } = await service
        .from('courts')
        .select('price_per_slot, club_id')
        .eq('id', parsed.data.court_id)
        .single()

    if (!court) return { error: 'Quadra não encontrada' }

    const total_price = court.price_per_slot
    const price_per_player = total_price / (parsed.data.players.length || 1)

    const { data, error } = await service
        .from('reservations')
        .insert({
            profile_id: user.id,
            club_id: court.club_id,
            court_id: parsed.data.court_id,
            date: parsed.data.date,
            start_time: parsed.data.start_time,
            end_time,
            duration: parsed.data.duration,
            players: parsed.data.players,
            total_price,
            price_per_player,
            status: 'confirmed',
            created_by: user.id,
        })
        .select()
        .single()

    if (error) return { error: error.message }

    // Disparo assíncrono — não bloqueia a resposta ao cliente
    // Verifica se já é membro; se não for, associa ao clube
    queueMicrotask(() => ensureClubMembership(user.id, court.club_id))

    revalidatePath('/reservations')
    revalidatePath('/admin/reservations')
    return { data, error: null }
}

export async function updateReservationStatus(id: string, status: string) {
    const { ctx, error: permError } = await assertStaffContext()
    if (permError || !ctx) return { error: permError ?? 'Erro' }
    const updateData: Record<string, unknown> = { status }
    if (status === 'checked_in') updateData.checked_in_at = new Date().toISOString()
    if (status === 'completed') updateData.completed_at = new Date().toISOString()
    if (status === 'cancelled') updateData.cancelled_at = new Date().toISOString()

    const service = createServiceClient()
    const { error } = await service
        .from('reservations')
        .update(updateData)
        .eq('id', id)
        .eq('club_id', ctx.clubId)

    if (error) return { error: error.message }
    revalidatePath('/reservations')
    revalidatePath('/admin/reservations')
    return { error: null }
}
