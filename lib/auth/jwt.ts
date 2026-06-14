import { verify } from 'jsonwebtoken'

/**
 * Verify a JWT access token and extract payload.
 * Edge-runtime safe: does not import Prisma.
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
