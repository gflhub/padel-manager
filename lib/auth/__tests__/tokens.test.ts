import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: () => Promise.resolve({ tokenVersion: 0 }),
    },
  },
}))

import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from '../tokens'

describe('Token Management', () => {
  const testUserId = 'user-123'
  const testSessionId = 'session-123'

  describe('JWT Access Tokens', () => {
    it('signAccessToken creates valid JWT with correct payload', async () => {
      const token = await signAccessToken(testUserId, testSessionId)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3) // JWT has 3 parts
    })

    it('verifyAccessToken validates and decodes valid token', async () => {
      const token = await signAccessToken(testUserId, testSessionId)
      const payload = await verifyAccessToken(token)

      expect(payload).toBeDefined()
      expect(payload?.sub).toBe(testUserId)
      expect(payload?.sessionId).toBe(testSessionId)
    })

    it('verifyAccessToken returns null for invalid token', async () => {
      const invalidToken = 'invalid.token.here'
      const payload = await verifyAccessToken(invalidToken)
      expect(payload).toBeNull()
    })

    it('verifyAccessToken returns null for expired token', async () => {
      const expiredToken = await signAccessToken(testUserId, testSessionId, '0s')
      await new Promise(resolve => setTimeout(resolve, 100))
      const payload = await verifyAccessToken(expiredToken)
      expect(payload).toBeNull()
    })
  })

  describe('Refresh Tokens', () => {
    it('generateRefreshToken produces 64-character hex string', () => {
      const token = generateRefreshToken()
      expect(token).toMatch(/^[a-f0-9]{64}$/)
    })

    it('generateRefreshToken produces unique tokens', () => {
      const token1 = generateRefreshToken()
      const token2 = generateRefreshToken()
      expect(token1).not.toBe(token2)
    })

    it('hashRefreshToken produces consistent hash', () => {
      const token = generateRefreshToken()
      const hash1 = hashRefreshToken(token)
      const hash2 = hashRefreshToken(token)
      expect(hash1).toBe(hash2)
    })

    it('different tokens produce different hashes', () => {
      const token1 = generateRefreshToken()
      const token2 = generateRefreshToken()
      const hash1 = hashRefreshToken(token1)
      const hash2 = hashRefreshToken(token2)
      expect(hash1).not.toBe(hash2)
    })

    it('hash is SHA-256 format', () => {
      const token = generateRefreshToken()
      const hash = hashRefreshToken(token)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })
  })
})
