'use server'

import { requireUser } from '@/lib/auth/session'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import * as userRepo from '@/lib/repositories/users'

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  phone: z.string().optional().or(z.literal('')).nullable(),
  cpf: z.string().optional().or(z.literal('')).nullable(),
})

export async function updateProfile(formData: FormData) {
  try {
    const user = await requireUser()

    const name = formData.get('name') as string | null
    const phone = formData.get('phone') as string | null
    const cpf = formData.get('cpf') as string | null

    const result = updateProfileSchema.safeParse({ name, phone, cpf })
    if (!result.success) {
      return { error: result.error.issues[0].message, data: null }
    }

    const updateResult = await userRepo.updateUserProfile(user.id, {
      name: result.data.name || undefined,
      phone: result.data.phone || undefined,
      cpf: result.data.cpf || undefined,
    })

    if (updateResult.error) {
      return { error: updateResult.error, data: null }
    }

    revalidatePath('/profile')
    return { data: updateResult.data, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar perfil'
    return { error: message, data: null }
  }
}

export async function getProfile() {
  try {
    const user = await requireUser()
    return userRepo.getUserProfile(user.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar perfil'
    return { error: message, data: null }
  }
}

export async function getCurrentUserEmail() {
  try {
    const user = await requireUser()
    return { data: { email: user.email || '' }, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar email do usuário'
    return { error: message, data: null }
  }
}
