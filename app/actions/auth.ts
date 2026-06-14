'use server'

import { z } from 'zod'
import * as bcrypt from 'bcrypt'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import * as tokens from '@/lib/auth/tokens'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const signUpSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().optional(),
})

const signInSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

// ============================================================================
// SIGN UP
// ============================================================================

export async function signUp(
  email: string,
  password: string,
  name?: string
): Promise<{ data?: { userId: string; isStaff: boolean }; error?: string }> {
  try {
    // Validate input
    const { email: validEmail, password: validPassword, name: validName } = signUpSchema.parse({
      email: email.toLowerCase().trim(),
      password,
      name: name?.trim(),
    })

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validEmail },
    })

    if (existingUser) {
      return { error: 'Invalid email or password' }
    }

    // Hash password with bcrypt (10 salt rounds)
    const passwordHash = await bcrypt.hash(validPassword, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validEmail,
        passwordHash,
        globalRole: 'CLIENT',
        active: true,
      },
    })

    // Create profile
    const profileName = validName || validEmail
    await prisma.profile.create({
      data: {
        userId: user.id,
        name: profileName,
        email: validEmail,
        active: true,
      },
    })

    // Create session and get tokens
    const { accessToken, refreshToken } = await tokens.createSession(user.id)

    // Set cookies
    const cookieStore = await cookies()
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    }

    cookieStore.set('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60, // 15 minutes
    })

    cookieStore.set('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return {
      data: {
        userId: user.id,
        isStaff: false, // New users are never staff initially
      },
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]
      return { error: firstIssue.message }
    }

    const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign up'
    console.error('Sign up error:', errorMessage)
    return { error: 'Invalid email or password' }
  }
}

// ============================================================================
// SIGN IN
// ============================================================================

export async function signIn(
  email: string,
  password: string
): Promise<{ data?: { userId: string; isStaff: boolean }; error?: string }> {
  try {
    // Validate input
    const { email: validEmail, password: validPassword } = signInSchema.parse({
      email: email.toLowerCase().trim(),
      password,
    })

    // Look up user by email
    const user = await prisma.user.findUnique({
      where: { email: validEmail },
    })

    // If user doesn't exist or not active, don't reveal it
    if (!user || !user.active) {
      return { error: 'Invalid credentials' }
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(validPassword, user.passwordHash)

    if (!passwordMatch) {
      return { error: 'Invalid credentials' }
    }

    // Create session and get tokens
    const { accessToken, refreshToken } = await tokens.createSession(user.id)

    // Set cookies
    const cookieStore = await cookies()
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
    }

    cookieStore.set('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60, // 15 minutes
    })

    cookieStore.set('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    const staffResult = await checkUserStaffRole(user.id)

    return {
      data: {
        userId: user.id,
        isStaff: staffResult.isStaff,
      },
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: 'Invalid credentials' }
    }

    const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign in'
    console.error('Sign in error:', errorMessage)
    return { error: 'Invalid credentials' }
  }
}

// ============================================================================
// SIGN OUT (invalidates the session and bumps tokenVersion, clears cookies)
// ============================================================================

export async function signOut(): Promise<{ error?: string }> {
  const cookieStore = await cookies()

  try {
    const accessToken = cookieStore.get('accessToken')?.value
    if (accessToken) {
      const payload = await tokens.verifyAccessToken(accessToken)

      if (payload?.sub) {
        await prisma.user.update({
          where: { id: payload.sub },
          data: { tokenVersion: { increment: 1 } },
        })
      }

      if (payload?.sessionId) {
        await tokens.revokeSession(payload.sessionId)
      }
    }

    cookieStore.delete('accessToken')
    cookieStore.delete('refreshToken')

    return {}
  } catch (error) {
    // Clear cookies anyway for cleanup (graceful degradation)
    cookieStore.delete('accessToken')
    cookieStore.delete('refreshToken')

    const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign out'
    console.error('Sign out error:', errorMessage)
    return { error: 'Logout failed but cookies cleared' }
  }
}

// ============================================================================
// REFRESH ACCESS TOKEN
// ============================================================================

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ data?: { accessToken: string; refreshToken: string }; error?: string }> {
  try {
    // Validate input
    const { refreshToken: validRefreshToken } = refreshTokenSchema.parse({
      refreshToken,
    })

    // Call refresh token function
    const result = await tokens.refreshAccessToken(validRefreshToken)

    if (!result) {
      return { error: 'Invalid or expired refresh token' }
    }

    return {
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: 'Invalid refresh token' }
    }

    const errorMessage = error instanceof Error ? error.message : 'An error occurred during token refresh'
    console.error('Token refresh error:', errorMessage)
    return { error: 'Invalid or expired refresh token' }
  }
}

// ============================================================================
// CHECK USER STAFF ROLE (for backward compatibility)
// ============================================================================

export async function checkUserStaffRole(userId: string): Promise<{ isStaff: boolean; error: string | null }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profile: { select: { id: true } } },
    })

    const profileId = user?.profile?.id

    if (!profileId) {
      return { isStaff: false, error: null }
    }

    const staffRole = await prisma.clubStaff.findFirst({
      where: {
        profileId,
        active: true,
      },
      select: {
        role: true,
      },
    })

    return { isStaff: !!staffRole, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error checking staff role'
    return { isStaff: false, error: message }
  }
}
