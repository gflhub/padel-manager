'use server'

import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/auth/tokens'
import { prisma } from '@/lib/db/prisma'

export interface User {
  id: string
  email: string
  profileId?: string
}

export interface ClubContext {
  clubId: string
  role: string
  userId: string
}

/**
 * Get the current user from the session.
 * Verifies the JWT access token and ensures its tokenVersion matches the
 * user's current tokenVersion (revoked tokens are rejected).
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')?.value

    if (accessToken) {
      const payload = await verifyAccessToken(accessToken)

      if (payload) {
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          include: {
            profile: {
              select: { id: true, email: true },
            },
          },
        })

        if (user && user.tokenVersion === payload.tokenVersion) {
          return {
            id: user.id,
            email: user.profile?.email || user.email,
            profileId: user.profile?.id,
          }
        }
      }
    }
  } catch (error) {
    console.error('[session] getCurrentUser failed:', error)
  }

  return null
}

/**
 * Require the user to be authenticated.
 * Throws an error if not authenticated.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized: User not authenticated')
  }

  return user
}

/**
 * Require the user to have a club context (be a staff member).
 * Queries Prisma for club staff data. Returns { clubId, role, userId } or throws an error.
 */
export async function requireClubContext(userId: string): Promise<ClubContext> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profile: { select: { id: true } } },
    })

    const profileId = user?.profile?.id

    if (!profileId) {
      throw new Error('User is not a staff member of any club')
    }

    // Query club_staff with active status, ordered by creation date
    const clubStaff = await prisma.clubStaff.findFirst({
      where: {
        profileId,
        active: true,
      },
      select: {
        clubId: true,
        role: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    if (!clubStaff) {
      throw new Error('User is not a staff member of any club')
    }

    return {
      clubId: clubStaff.clubId,
      role: clubStaff.role,
      userId,
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'User is not a staff member of any club') {
      throw error
    }
    throw new Error('Failed to fetch club context')
  }
}

/**
 * Refresh the session using the JWT refresh token.
 * Updates both access and refresh tokens in cookies if successful.
 * Returns the current user or null if refresh failed.
 */
export async function refreshSession(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refreshToken')?.value

    if (refreshToken) {
      const { refreshAccessToken } = await import('@/lib/auth/tokens')
      const result = await refreshAccessToken(refreshToken)

      if (result) {
        // Update cookies with new tokens
        const options = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax' as const,
          maxAge: 15 * 60, // 15 minutes for access token
        }

        cookieStore.set('accessToken', result.accessToken, options)
        cookieStore.set('refreshToken', result.refreshToken, {
          ...options,
          maxAge: 30 * 24 * 60 * 60, // 30 days for refresh token
        })

        // Return current user with new JWT
        return getCurrentUser()
      }
    }
  } catch (error) {
    console.error('[session] refreshSession failed:', error)
  }

  return null
}
