'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
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
 * Tries JWT verification first (app-owned tokens), then falls back to Supabase.
 * Returns null if not authenticated via either method.
 */
export async function getCurrentUser(): Promise<User | null> {
  // Try JWT verification first (app-owned tokens)
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('accessToken')?.value

    if (accessToken) {
      const payload = await verifyAccessToken(accessToken)

      if (payload) {
        // JWT is valid, fetch user from database
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          include: {
            profile: {
              select: { id: true, email: true },
            },
          },
        })

        if (user) {
          return {
            id: user.id,
            email: user.profile?.email || user.email,
            profileId: user.profile?.id,
          }
        }
      }
    }
  } catch {
    // Silent catch: fall through to Supabase fallback
  }

  // Fallback to Supabase for migration period
  try {
    const supabase = createClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      return null
    }

    // Fetch the profile to get profileId
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .single()

    return {
      id: data.user.id,
      email: data.user.email || '',
      profileId: profile?.id,
    }
  } catch {
    return null
  }
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
    // Query club_staff with active status, ordered by creation date
    const clubStaff = await prisma.clubStaff.findFirst({
      where: {
        userId,
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
 * Refresh the session using JWT refresh token or Supabase.
 * Tries JWT refresh first (app-owned tokens), then falls back to Supabase.
 * Updates both access and refresh tokens in cookies if successful.
 * Returns the current user or null if refresh failed.
 */
export async function refreshSession(): Promise<User | null> {
  // Try JWT refresh first (app-owned tokens)
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
  } catch {
    // Silent catch: fall through to Supabase fallback
  }

  // Fallback to Supabase for migration period
  try {
    const supabase = createClient()

    // Supabase middleware handles token refresh automatically
    // Just verify the user still exists
    return getCurrentUser()
  } catch {
    return null
  }
}
