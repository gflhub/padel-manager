'use server'

import { prisma } from '@/lib/db/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const updateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['ADMIN', 'STAFF', 'CLIENT']),
})

const setUserActiveSchema = z.object({
  userId: z.string().min(1),
  active: z.boolean(),
})

const linkClubStaffSchema = z.object({
  clubId: z.string().min(1),
  profileId: z.string().min(1),
  role: z.string().min(1),
})

const deactivateClubStaffSchema = z.object({
  staffId: z.string().min(1),
})

const createClubSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  ownerId: z.string().min(1),
  ownerRole: z.string().optional().default('OWNER'),
})

export async function updateUserRole(formData: FormData) {
  const result = updateUserRoleSchema.safeParse({
    userId: formData.get('userId'),
    role: formData.get('role'),
  })

  if (!result.success) {
    return { error: result.error.issues[0].message, data: null }
  }

  try {
    const data = await prisma.user.update({
      where: { id: result.data.userId },
      data: { globalRole: result.data.role }
    })

    revalidatePath('/admin/users')
    return { data, error: null }
  } catch (err) {
    return { error: (err as Error).message, data: null }
  }
}

export async function setUserActive(formData: FormData) {
  const result = setUserActiveSchema.safeParse({
    userId: formData.get('userId'),
    active: formData.get('active') === 'true',
  })

  if (!result.success) {
    return { error: result.error.issues[0].message, data: null }
  }

  try {
    const data = await prisma.user.update({
      where: { id: result.data.userId },
      data: { active: result.data.active }
    })

    revalidatePath('/admin/users')
    return { data, error: null }
  } catch (err) {
    return { error: (err as Error).message, data: null }
  }
}

export async function linkClubStaff(formData: FormData) {
  const result = linkClubStaffSchema.safeParse({
    clubId: formData.get('clubId'),
    profileId: formData.get('profileId'),
    role: formData.get('role'),
  })

  if (!result.success) {
    return { error: result.error.issues[0].message, data: null }
  }

  try {
    const data = await prisma.clubStaff.create({
      data: {
        clubId: result.data.clubId,
        profileId: result.data.profileId,
        role: result.data.role as any,
        active: true,
      }
    })

    revalidatePath('/admin/users')
    return { data, error: null }
  } catch (err) {
    return { error: (err as Error).message, data: null }
  }
}

export async function deactivateClubStaff(staffId: string) {
  try {
    const data = await prisma.clubStaff.update({
      where: { id: staffId },
      data: { active: false }
    })

    revalidatePath('/admin/users')
    return { data, error: null }
  } catch (err) {
    return { error: (err as Error).message, data: null }
  }
}

export async function createClub(formData: FormData) {
  const result = createClubSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    ownerId: formData.get('ownerId'),
    ownerRole: formData.get('ownerRole'),
  })

  if (!result.success) {
    return { error: result.error.issues[0].message, data: null }
  }

  try {
    const club = await prisma.club.create({
      data: {
        name: result.data.name,
        description: undefined,
        active: true,
      }
    })

    const staff = await prisma.clubStaff.create({
      data: {
        clubId: club.id,
        profileId: result.data.ownerId,
        role: result.data.ownerRole as any,
        active: true,
      }
    })

    revalidatePath('/admin/users')
    return { data: { club, staff }, error: null }
  } catch (err) {
    return { error: (err as Error).message, data: null }
  }
}
