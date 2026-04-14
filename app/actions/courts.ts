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

const courtSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    court_type: z.enum(['padel', 'tennis', 'beach_tennis', 'volleyball', 'futsal', 'squash', 'other']),
    price_per_slot: z.coerce.number().min(0),
    duration_slot: z.coerce.number().min(30),
    active: z.boolean().optional().default(true),
})

export async function getCourts() {
    const { ctx, error: permError } = await assertStaffContext()
    if (permError || !ctx) return { error: permError ?? 'Erro', data: null }
    const service = createServiceClient()
    const { data, error } = await service
        .from('courts')
        .select('*')
        .eq('club_id', ctx.clubId)
        .order('name')
    if (error) return { error: error.message, data: null }
    return { data, error: null }
}

export async function createCourt(formData: FormData) {
    const { ctx, error: permError } = await assertStaffContext()
    if (permError || !ctx) return { error: permError ?? 'Erro' }
    const raw = {
        name: formData.get('name') as string,
        court_type: formData.get('court_type') as string,
        price_per_slot: formData.get('price_per_slot'),
        duration_slot: formData.get('duration_slot'),
        active: formData.get('active') === 'true',
    }
    const parsed = courtSchema.safeParse(raw)
    if (!parsed.success) return { error: parsed.error.issues[0].message }
    const service = createServiceClient()
    const { data, error } = await service
        .from('courts')
        .insert({ ...parsed.data, club_id: ctx.clubId })
        .select()
        .single()
    if (error) return { error: error.message }
    revalidatePath('/admin/courts')
    return { data, error: null }
}

export async function updateCourt(id: string, formData: FormData) {
    const { ctx, error: permError } = await assertStaffContext()
    if (permError || !ctx) return { error: permError ?? 'Erro' }
    const raw = {
        name: formData.get('name') as string,
        court_type: formData.get('court_type') as string,
        price_per_slot: formData.get('price_per_slot'),
        duration_slot: formData.get('duration_slot'),
        active: formData.get('active') === 'true',
    }
    const parsed = courtSchema.safeParse(raw)
    if (!parsed.success) return { error: parsed.error.issues[0].message }
    const service = createServiceClient()
    const { data, error } = await service
        .from('courts')
        .update(parsed.data)
        .eq('id', id)
        .eq('club_id', ctx.clubId)
        .select()
        .single()
    if (error) return { error: error.message }
    revalidatePath('/admin/courts')
    return { data, error: null }
}

export async function deleteCourt(id: string) {
    const { ctx, error: permError } = await assertStaffContext()
    if (permError || !ctx) return { error: permError ?? 'Erro' }
    const service = createServiceClient()
    const { error } = await service
        .from('courts')
        .delete()
        .eq('id', id)
        .eq('club_id', ctx.clubId)
    if (error) return { error: error.message }
    revalidatePath('/admin/courts')
    return { error: null }
}
