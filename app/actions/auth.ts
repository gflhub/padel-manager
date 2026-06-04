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
): Promise<{ data?: { accessToken: string; refreshToken: string }; error?: string }> {
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
        accessToken,
        refreshToken,
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
): Promise<{ data?: { accessToken: string; refreshToken: string }; error?: string }> {
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

    return {
      data: {
        accessToken,
        refreshToken,
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
// SIGN OUT
// ============================================================================

export async function signOut(sessionId?: string): Promise<{ error?: string }> {
  try {
    if (!sessionId) {
      return { error: 'Session ID is required' }
    }

    const success = await tokens.revokeSession(sessionId)

    if (!success) {
      return { error: 'Failed to sign out' }
    }

    return {}
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign out'
    console.error('Sign out error:', errorMessage)
    return { error: 'Failed to sign out' }
  }
}

// ============================================================================
// LOGOUT (revokes session and clears cookies)
// ============================================================================

export async function logout(): Promise<{ error?: string }> {
  try {
    const cookieStore = await cookies()

    // Extract session ID from access token
    const accessToken = cookieStore.get('accessToken')?.value
    if (accessToken) {
      const payload = await tokens.verifyAccessToken(accessToken)
      if (payload?.sessionId) {
        await tokens.revokeSession(payload.sessionId)
      }
    }

    // Clear cookies
    cookieStore.delete('accessToken')
    cookieStore.delete('refreshToken')

    return {}
  } catch (error) {
    // Clear cookies anyway for cleanup (graceful degradation)
    try {
      const cookieStore = await cookies()
      cookieStore.delete('accessToken')
      cookieStore.delete('refreshToken')
    } catch {
      // Ignore errors during cleanup
    }

    const errorMessage = error instanceof Error ? error.message : 'An error occurred during logout'
    console.error('Logout error:', errorMessage)
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
    const staffRole = await prisma.clubStaff.findFirst({
      where: {
        userId,
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
