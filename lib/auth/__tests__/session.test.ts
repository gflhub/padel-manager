import { describe, it, expect, vi, beforeEach } from 'vitest'

const findUniqueMock = vi.fn()
const findFirstMock = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
    clubStaff: {
      findFirst: (...args: unknown[]) => findFirstMock(...args),
    },
  },
}))

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ get: () => undefined }),
}))

import { requireClubContext } from '../session'

describe('requireClubContext', () => {
  beforeEach(() => {
    findUniqueMock.mockReset()
    findFirstMock.mockReset()
  })

  it('resolves clubId and role via profileId when userId is null on ClubStaff', async () => {
    findUniqueMock.mockResolvedValue({ profile: { id: 'profile-1' } })
    findFirstMock.mockResolvedValue({ clubId: 'club-1', role: 'OWNER' })

    const result = await requireClubContext('user-1')

    expect(result).toEqual({ clubId: 'club-1', role: 'OWNER', userId: 'user-1' })
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { profileId: 'profile-1', active: true },
      })
    )
  })

  it('throws when the user has no active ClubStaff record', async () => {
    findUniqueMock.mockResolvedValue({ profile: { id: 'profile-1' } })
    findFirstMock.mockResolvedValue(null)

    await expect(requireClubContext('user-1')).rejects.toThrow(
      'User is not a staff member of any club'
    )
  })

  it('throws when the user has no profile', async () => {
    findUniqueMock.mockResolvedValue({ profile: null })

    await expect(requireClubContext('user-1')).rejects.toThrow(
      'User is not a staff member of any club'
    )
  })
})
