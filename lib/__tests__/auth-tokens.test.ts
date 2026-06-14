import { describe, it, expect, vi, beforeEach } from 'vitest'

process.env.JWT_SECRET = 'test-secret'

const userFindUnique = vi.fn()
const sessionFindFirst = vi.fn()
const sessionUpdate = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => userFindUnique(...args) },
    session: {
      findFirst: (...args: unknown[]) => sessionFindFirst(...args),
      update: (...args: unknown[]) => sessionUpdate(...args),
    },
  },
}))

import { signAccessToken, refreshAccessToken } from '../auth/tokens'
import { verifyAccessToken } from '../auth/jwt'

describe('signAccessToken / verifyAccessToken', () => {
  beforeEach(() => {
    userFindUnique.mockReset()
    sessionFindFirst.mockReset()
    sessionUpdate.mockReset()
  })

  it('signs a token embedding the user current tokenVersion and verifies it back', async () => {
    userFindUnique.mockResolvedValue({ tokenVersion: 3 })

    const token = await signAccessToken('user-1', 'session-1')
    const payload = await verifyAccessToken(token)

    expect(payload).not.toBeNull()
    expect(payload?.sub).toBe('user-1')
    expect(payload?.sessionId).toBe('session-1')
    expect(payload?.tokenVersion).toBe(3)
  })

  it('rejects a token signed with a different secret', async () => {
    userFindUnique.mockResolvedValue({ tokenVersion: 0 })
    const token = await signAccessToken('user-1', 'session-1')

    const original = process.env.JWT_SECRET
    process.env.JWT_SECRET = 'a-different-secret'
    const payload = await verifyAccessToken(token)
    process.env.JWT_SECRET = original

    expect(payload).toBeNull()
  })
})

describe('refreshAccessToken', () => {
  beforeEach(() => {
    userFindUnique.mockReset()
    sessionFindFirst.mockReset()
    sessionUpdate.mockReset()
  })

  it('returns null when no session matches the refresh token', async () => {
    sessionFindFirst.mockResolvedValue(null)

    const result = await refreshAccessToken('unknown-token')

    expect(result).toBeNull()
  })

  it('returns null when the session has been revoked (logout)', async () => {
    sessionFindFirst.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      revokedAt: new Date(),
    })

    const result = await refreshAccessToken('revoked-token')

    expect(result).toBeNull()
  })

  it('returns null when the session has expired', async () => {
    sessionFindFirst.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
    })

    const result = await refreshAccessToken('expired-token')

    expect(result).toBeNull()
  })

  it('issues a new access/refresh token pair for a valid session', async () => {
    sessionFindFirst.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      revokedAt: null,
    })
    userFindUnique
      .mockResolvedValueOnce({ active: true })
      .mockResolvedValueOnce({ tokenVersion: 0 })
    sessionUpdate.mockResolvedValue({ id: 'session-1' })

    const result = await refreshAccessToken('valid-token')

    expect(result).not.toBeNull()
    expect(result?.sessionId).toBe('session-1')
    expect(typeof result?.accessToken).toBe('string')
    expect(typeof result?.refreshToken).toBe('string')
  })
})
