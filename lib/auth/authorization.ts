'use server'

import { prisma } from '@/lib/db/prisma'

/**
 * Check if user has one of the allowed staff roles at their club.
 * Returns true if the user has a matching role, false otherwise.
 */
export async function requireStaffRole(
  userId: string,
  allowedRoles: string[]
): Promise<boolean> {
  try {
    const clubStaff = await prisma.clubStaff.findFirst({
      where: { profileId: userId, active: true },
      select: { role: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!clubStaff) {
      return false
    }

    return allowedRoles.includes(clubStaff.role)
  } catch (error) {
    console.error('[authorization] role check failed:', error)
    return false
  }
}

/**
 * Check if user can manage resources in a specific club.
 * Returns true if the user is a staff member with management role or higher.
 */
export async function canManageClubResource(
  userId: string,
  clubId: string
): Promise<boolean> {
  try {
    const clubStaff = await prisma.clubStaff.findFirst({
      where: { profileId: userId, clubId, active: true },
      select: { role: true },
    })

    if (!clubStaff) {
      return false
    }

    const managerRoles = ['MANAGER', 'OWNER']
    return managerRoles.includes(clubStaff.role)
  } catch (error) {
    console.error('[authorization] role check failed:', error)
    return false
  }
}

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

/**
 * Check if user can manage another user.
 * Only global admins or club owners (within the same club) can manage other users.
 * Returns true if authorized, false otherwise.
 */
export async function canManageUser(
  userId: string,
  targetUserId: string
): Promise<boolean> {
  try {
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { globalRole: true },
    })

    if (adminUser?.globalRole === 'ADMIN') {
      return true
    }

    const userStaff = await prisma.clubStaff.findFirst({
      where: { profileId: userId, active: true },
      select: { clubId: true, role: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!userStaff) {
      return false
    }

    const targetStaff = await prisma.clubStaff.findFirst({
      where: { profileId: targetUserId, active: true },
      select: { clubId: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!targetStaff) {
      return false
    }

    return userStaff.clubId === targetStaff.clubId && userStaff.role === 'OWNER'
  } catch (error) {
    console.error('[authorization] role check failed:', error)
    return false
  }
}
