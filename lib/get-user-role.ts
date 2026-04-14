'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * Busca o role do usuário usando service role para evitar problemas de RLS
 */
export async function getUserRole(userId: string): Promise<string | null> {
    const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    const { data } = await serviceClient
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

    return data?.role || null
}
