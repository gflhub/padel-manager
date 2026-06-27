'use server'

import { prisma } from '@/lib/db/prisma'

/**
 * Check if a user has the global ADMIN role (platform administrator).
 * @param userId - User.id (global account id, not Profile.id)
 */
export async function requireGlobalAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { globalRole: true },
    })

    return user?.globalRole === 'ADMIN'
  } catch (error) {
    console.error('[authorization] role check failed:', error)
    return false
  }
}

