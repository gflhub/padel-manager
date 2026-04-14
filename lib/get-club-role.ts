'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'

function getService() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}

/**
 * Retorna o role do usuário no primeiro clube ao qual está vinculado como staff.
 * Retorna null se não for staff de nenhum clube.
 */
export async function getClubRole(profileId: string): Promise<string | null> {
    const { data } = await getService()
        .from('club_staff')
        .select('role')
        .eq('profile_id', profileId)
        .eq('active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

    return data?.role ?? null
}

/**
 * Retorna o club_id do primeiro clube em que o usuário é staff.
 */
export async function getClubId(profileId: string): Promise<string | null> {
    const { data } = await getService()
        .from('club_staff')
        .select('club_id')
        .eq('profile_id', profileId)
        .eq('active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

    return data?.club_id ?? null
}

/**
 * Retorna { clubId, role } do usuário, ou null se não for staff.
 */
export async function getClubContext(profileId: string): Promise<{ clubId: string; role: string } | null> {
    const { data } = await getService()
        .from('club_staff')
        .select('club_id, role')
        .eq('profile_id', profileId)
        .eq('active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

    if (!data) return null
    return { clubId: data.club_id, role: data.role }
}
