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

export async function getComandas(status?: string) {
    const { ctx, error: permError } = await assertStaffContext()
    if (permError || !ctx) return { error: permError ?? 'Erro', data: null }
    const service = createServiceClient()
    let query = service
        .from('comandas')
        .select('*, items_count:comanda_items(count)')
        .eq('club_id', ctx.clubId)
        .order('opened_at', { ascending: false })
    if (status) query = query.eq('status', status)
    const { data, error } = await query
    if (error) return { error: error.message, data: null }
    // Normaliza items_count para número
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalized = (data || []).map((c: any) => ({
        ...c,
        items_count: Array.isArray(c.items_count) ? (c.items_count as Array<{ count: number }>)[0]?.count ?? 0 : 0,
        total_amount: c.total as number,
    }))
    return { data: normalized, error: null }
}

export async function getComandaWithItems(id: string) {
    const { ctx, error: permError } = await assertStaffContext()
    if (permError || !ctx) return { error: permError ?? 'Erro', data: null }
    const service = createServiceClient()
    const [comandaRes, itemsRes] = await Promise.all([
        service.from('comandas').select('*').eq('id', id).eq('club_id', ctx.clubId).single(),
        service.from('comanda_items').select('*').eq('comanda_id', id).order('created_at', { ascending: true }),
    ])
    if (comandaRes.error) return { error: comandaRes.error.message, data: null }
    const comanda = {
        ...comandaRes.data,
        total_amount: comandaRes.data.total,
        items: (itemsRes.data || []).map((item: Record<string, unknown>) => ({
            ...item,
            // Adapta para interface esperada pela UI
            product_details: { product_name: item.name, quantity: item.quantity, unit_price: item.unit_price },
            subtotal: item.total_price,
            item_type: 'product',
        })),
    }
    return { data: comanda, error: null }
}

export async function createComanda(formData: FormData) {
    const { ctx, error: permError } = await assertStaffContext()
    if (permError || !ctx) return { error: permError ?? 'Erro' }

    const customer_name = (formData.get('customer_name') as string)?.trim()
    if (!customer_name) return { error: 'Nome do cliente é obrigatório' }

    const service = createServiceClient()
    const { data, error } = await service
        .from('comandas')
        .insert({
            customer_name,
            club_id: ctx.clubId,
            notes: formData.get('customer_phone') ? `Tel: ${formData.get('customer_phone')}` : null,
            opened_by: ctx.userId,
        })
        .select()
        .single()

    if (error) return { error: error.message }
    const result = { ...data, total_amount: data.total, items_count: 0 }
    revalidatePath('/admin/comandas')
    return { data: result, error: null }
}

export async function addComandaItem(comandaId: string, formData: FormData) {
    const { ctx, error: permError } = await assertStaffContext()
    if (permError || !ctx) return { error: permError ?? 'Erro' }

    const unit_price = Number(formData.get('unit_price'))
    const quantity = Number(formData.get('quantity')) || 1
    const total_price = unit_price * quantity
    const product_id = formData.get('product_id') as string || null
    const name = formData.get('product_name') as string

    const service = createServiceClient()
    const { data, error } = await service
        .from('comanda_items')
        .insert({ comanda_id: comandaId, product_id, name, unit_price, quantity, total_price })
        .select()
        .single()

    if (error) return { error: error.message }

    // Atualiza total da comanda
    const { data: items } = await service
        .from('comanda_items')
        .select('total_price')
        .eq('comanda_id', comandaId)
    const newTotal = (items || []).reduce((sum: number, i: { total_price: number }) => sum + Number(i.total_price), 0)
    await service.from('comandas').update({ total: newTotal }).eq('id', comandaId)

    revalidatePath('/admin/comandas')
    return { data, error: null }
}

export async function closeComanda(id: string, paymentMethod: string) {
    const { ctx, error: permError } = await assertStaffContext()
    if (permError || !ctx) return { error: permError ?? 'Erro' }

    const service = createServiceClient()
    const { error } = await service
        .from('comandas')
        .update({
            status: 'closed',
            closed_at: new Date().toISOString(),
            closed_by: ctx.userId,
            notes: paymentMethod ? `Pagamento: ${paymentMethod}` : undefined,
        })
        .eq('id', id)
        .eq('club_id', ctx.clubId)

    if (error) return { error: error.message }
    revalidatePath('/admin/comandas')
    return { error: null }
}
