'use server'

import { requireUser, requireClubContext } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import * as productRepo from '@/lib/repositories/products'

const productSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    category: z.enum(['bebidas', 'lanches', 'doces', 'outros']),
    price: z.coerce.number().min(0),
    stock: z.coerce.number().min(0).optional().default(0),
    active: z.boolean().optional().default(true),
})

export async function getProducts(category?: string) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)
        return productRepo.getProductsByClub(context.clubId, category)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao buscar produtos'
        return { error: message, data: null }
    }
}

export async function createProduct(formData: FormData) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)

        const raw = {
            name: formData.get('name') as string,
            category: formData.get('category') as string,
            price: formData.get('price'),
            stock: formData.get('stock'),
            active: formData.get('active') === 'true',
        }
        const parsed = productSchema.safeParse(raw)
        if (!parsed.success) return { error: parsed.error.issues[0].message }

        const result = await productRepo.createProduct(
            context.clubId,
            parsed.data.name,
            parsed.data.category as 'bebidas' | 'lanches' | 'doces' | 'outros',
            parsed.data.price,
            parsed.data.stock,
            parsed.data.active
        )

        if (result.error) return { error: result.error }
        revalidatePath('/admin/products')
        return { data: result.data, error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao criar produto'
        return { error: message }
    }
}

export async function updateProduct(id: string, formData: FormData) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)

        const raw = {
            name: formData.get('name') as string,
            category: formData.get('category') as string,
            price: formData.get('price'),
            stock: formData.get('stock'),
            active: formData.get('active') === 'true',
        }
        const parsed = productSchema.safeParse(raw)
        if (!parsed.success) return { error: parsed.error.issues[0].message }

        const result = await productRepo.updateProduct(
            id,
            context.clubId,
            {
                name: parsed.data.name,
                category: parsed.data.category as 'bebidas' | 'lanches' | 'doces' | 'outros',
                price: parsed.data.price,
                stock: parsed.data.stock,
                active: parsed.data.active,
            }
        )

        if (result.error) return { error: result.error }
        revalidatePath('/admin/products')
        return { data: result.data, error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao atualizar produto'
        return { error: message }
    }
}

export async function deleteProduct(id: string) {
    try {
        const user = await requireUser()
        const context = await requireClubContext(user.id)

        const result = await productRepo.deleteProduct(id, context.clubId)
        if (result.error) return { error: result.error }

        revalidatePath('/admin/products')
        return { error: null }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao deletar produto'
        return { error: message }
    }
}
