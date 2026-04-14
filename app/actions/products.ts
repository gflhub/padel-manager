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

const productSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    category: z.enum(['bebidas', 'lanches', 'doces', 'outros']),
    price: z.coerce.number().min(0),
    stock: z.coerce.number().min(0).optional().default(0),
    active: z.boolean().optional().default(true),
})

export async function getProducts(category?: string) {
    const { ctx, error: permError } = await assertStaffContext()
    if (permError || !ctx) return { error: permError ?? 'Erro', data: null }
    const service = createServiceClient()
    let query = service.from('products').select('*').eq('club_id', ctx.clubId).order('category').order('name')
    if (category) query = query.eq('category', category)
    const { data, error } = await query
    if (error) return { error: error.message, data: null }
    return { data, error: null }
}

export async function createProduct(formData: FormData) {
    const { ctx, error: permError } = await assertStaffContext()
    if (permError || !ctx) return { error: permError ?? 'Erro' }
    const raw = {
        name: formData.get('name') as string,
        category: formData.get('category') as string,
        price: formData.get('price'),
        stock: formData.get('stock'),
        active: formData.get('active') === 'true',
    }
    const parsed = productSchema.safeParse(raw)
    if (!parsed.success) return { error: parsed.error.issues[0].message }
    const service = createServiceClient()
    const { data, error } = await service.from('products').insert({ ...parsed.data, club_id: ctx.clubId }).select().single()
    if (error) return { error: error.message }
    revalidatePath('/admin/products')
    return { data, error: null }
}

export async function updateProduct(id: string, formData: FormData) {
    const { ctx, error: permError } = await assertStaffContext()
    if (permError || !ctx) return { error: permError ?? 'Erro' }
    const raw = {
        name: formData.get('name') as string,
        category: formData.get('category') as string,
        price: formData.get('price'),
        stock: formData.get('stock'),
        active: formData.get('active') === 'true',
    }
    const parsed = productSchema.safeParse(raw)
    if (!parsed.success) return { error: parsed.error.issues[0].message }
    const service = createServiceClient()
    const { data, error } = await service.from('products').update(parsed.data).eq('id', id).eq('club_id', ctx.clubId).select().single()
    if (error) return { error: error.message }
    revalidatePath('/admin/products')
    return { data, error: null }
}

export async function deleteProduct(id: string) {
    const { ctx, error: permError } = await assertStaffContext()
    if (permError || !ctx) return { error: permError ?? 'Erro' }
    const service = createServiceClient()
    const { error } = await service.from('products').delete().eq('id', id).eq('club_id', ctx.clubId)
    if (error) return { error: error.message }
    revalidatePath('/admin/products')
    return { error: null }
}
