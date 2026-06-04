import { randomBytes, createHash } from 'crypto'
import { sign, verify, SignOptions } from 'jsonwebtoken'
import { prisma } from '../db/prisma'

// ============================================================================
// JWT ACCESS TOKEN FUNCTIONS
// ============================================================================

/**
 * Sign a JWT access token with user and session context.
 * @param userId - The user's ID
 * @param sessionId - The session's ID
 * @param expiresIn - Token expiry duration (default: "15m")
 * @returns Signed JWT token string
 */
export async function signAccessToken(
  userId: string,
  sessionId: string,
  expiresIn: string = '15m'
): Promise<string> {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured')
  }

  // Fetch current tokenVersion from user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true },
  })

  if (!user) {
    throw new Error(`User not found: ${userId}`)
  }

  const signOptions: SignOptions = { expiresIn: expiresIn as any }
  const token = sign(
    {
      sub: userId,
      sessionId,
      tokenVersion: user.tokenVersion,
    },
    secret,
    signOptions
  )

  return token
}

/**
 * Verify a JWT access token and extract payload.
 * @param token - The JWT token to verify
 * @returns Decoded payload on success, null if invalid or expired
 */
export async function verifyAccessToken(
  token: string
): Promise<{ sub: string; sessionId: string; tokenVersion: number } | null> {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured')
  }

  try {
    const decoded = verify(token, secret) as {
      sub: string
      sessionId: string
      tokenVersion: number
    }

    return decoded
  } catch {
    return null
  }
}

// ============================================================================
// REFRESH TOKEN FUNCTIONS
// ============================================================================

/**
 * Generate a cryptographically secure random refresh token.
 * @returns 32-byte hex string (~64 characters)
 */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Hash a refresh token for database storage.
 * @param token - The raw refresh token
 * @returns SHA-256 hex hash
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// ============================================================================
// SESSION MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Create a new session for a user.
 * Generates refresh token, hashes it, stores in database, and returns both tokens.
 * @param userId - The user's ID
 * @returns Object with accessToken, refreshToken, and sessionId
 */
export async function createSession(userId: string): Promise<{
  accessToken: string
  refreshToken: string
  sessionId: string
}> {
  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    throw new Error(`User not found: ${userId}`)
  }

  // Generate refresh token
  const refreshToken = generateRefreshToken()
  const refreshTokenHash = hashRefreshToken(refreshToken)

  // Create session in database
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  const session = await prisma.session.create({
    data: {
      userId,
      refreshTokenHash,
      expiresAt,
    },
  })

  // Sign access token
  const accessToken = await signAccessToken(userId, session.id)

  return {
    accessToken,
    refreshToken,
    sessionId: session.id,
  }
}

/**
 * Refresh an access token using a valid refresh token.
 * Validates refresh token against database, rotates token, and issues new access token.
 * @param refreshToken - The raw refresh token from client
 * @returns Object with new accessToken, refreshToken, and sessionId, or null if invalid
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{
  accessToken: string
  refreshToken: string
  sessionId: string
} | null> {
  const refreshTokenHash = hashRefreshToken(refreshToken)

  try {
    // Find session by hashed refresh token
    const session = await prisma.session.findFirst({
      where: {
        refreshTokenHash,
      },
    })

    if (!session) {
      return null
    }

    // Check if session is still valid (not expired, not revoked)
    if (session.expiresAt < new Date()) {
      return null
    }

    if (session.revokedAt) {
      return null
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { active: true },
    })

    if (!user || !user.active) {
      return null
    }

    // Generate new refresh token
    const newRefreshToken = generateRefreshToken()
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken)
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Update session with new refresh token
    const updatedSession = await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: newExpiresAt,
        lastUsedAt: new Date(),
      },
    })

    // Sign new access token
    const newAccessToken = await signAccessToken(
      session.userId,
      updatedSession.id
    )

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      sessionId: updatedSession.id,
    }
  } catch (error) {
    return null
  }
}

/**
 * Revoke a session by ID.
 * Marks the session as revoked, preventing further token refreshes.
 * @param sessionId - The session's ID
 * @returns True if revoked successfully, false otherwise
 */
export async function revokeSession(sessionId: string): Promise<boolean> {
  try {
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
      },
    })

    return true
  } catch {
    return false
  }
}
