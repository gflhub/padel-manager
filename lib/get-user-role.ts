'use server'

import { prisma } from '@/lib/db/prisma'

/**
 * Fetch user's global role using Prisma
 */
export async function getUserRole(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { globalRole: true }
    })

    return user?.globalRole || null
}
