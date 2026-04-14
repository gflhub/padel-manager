'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getClubContext } from '@/lib/get-club-role'
import { revalidatePath } from 'next/cache'

async function assertStaffContext() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ctx: null, error: 'Não autorizado' as const }
    const ctx = await getClubContext(user.id)
    if (!ctx) return { ctx: null, error: 'Sem permissão' as const }
    return { ctx: { ...ctx, userId: user.id }, error: null }
}

export async function updateComandaItemQuantity(itemId: string, newQuantity: number) {
    const { ctx, error: permError } = await assertStaffContext()
    if (permError || !ctx) return { error: permError ?? 'Erro' }

    const service = createServiceClient()

    // Buscar o item atual para calcular novo total
    const { data: item, error: fetchError } = await service
        .from('comanda_items')
        .select('unit_price, comanda_id')
        .eq('id', itemId)
        .single()

    if (fetchError || !item) return { error: fetchError?.message ?? 'Item não encontrado' }

    const newTotalPrice = Number(item.unit_price) * newQuantity

    const { error } = await service
        .from('comanda_items')
        .update({ quantity: newQuantity, total_price: newTotalPrice })
        .eq('id', itemId)

    if (error) return { error: error.message }

    // Recalcular total da comanda
    const { data: items } = await service
        .from('comanda_items')
        .select('total_price')
        .eq('comanda_id', item.comanda_id)
    const newTotal = (items || []).reduce((sum: number, i: { total_price: number }) => sum + Number(i.total_price), 0)
    await service.from('comandas').update({ total: newTotal }).eq('id', item.comanda_id)

    revalidatePath('/admin/comandas')
    return { error: null }
}

export async function cancelComanda(id: string) {
    const { ctx, error: permError } = await assertStaffContext()
    if (permError || !ctx) return { error: permError ?? 'Erro' }

    const service = createServiceClient()
    const { error } = await service
        .from('comandas')
        .update({ status: 'cancelled', closed_at: new Date().toISOString(), closed_by: ctx.userId })
        .eq('id', id)
        .eq('club_id', ctx.clubId)

    if (error) return { error: error.message }

    revalidatePath('/admin/comandas')
    return { error: null }
}
