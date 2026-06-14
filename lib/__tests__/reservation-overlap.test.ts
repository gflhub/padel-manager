import { describe, it, expect, vi, beforeEach } from 'vitest'

const reservationFindMany = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    reservation: {
      findMany: (...args: unknown[]) => reservationFindMany(...args),
    },
  },
}))

import { checkReservationOverlap } from '../repositories/reservations'

describe('checkReservationOverlap', () => {
  beforeEach(() => {
    reservationFindMany.mockReset()
  })

  it('detects overlap when the new slot intersects an existing reservation', async () => {
    reservationFindMany.mockResolvedValue([
      { id: 'res-1', startTime: '10:00', endTime: '11:00' },
    ])

    const result = await checkReservationOverlap('court-1', '2026-06-15', '10:30', '11:30')

    expect(result.hasOverlap).toBe(true)
  })

  it('does not detect overlap for back-to-back slots', async () => {
    reservationFindMany.mockResolvedValue([
      { id: 'res-1', startTime: '10:00', endTime: '11:00' },
    ])

    const result = await checkReservationOverlap('court-1', '2026-06-15', '11:00', '12:00')

    expect(result.hasOverlap).toBe(false)
  })

  it('ignores the reservation being edited via excludeId', async () => {
    reservationFindMany.mockResolvedValue([
      { id: 'res-1', startTime: '10:00', endTime: '11:00' },
    ])

    const result = await checkReservationOverlap('court-1', '2026-06-15', '10:30', '11:30', 'res-1')

    expect(result.hasOverlap).toBe(false)
  })

  it('returns no overlap when the court has no reservations that day', async () => {
    reservationFindMany.mockResolvedValue([])

    const result = await checkReservationOverlap('court-1', '2026-06-15', '08:00', '09:00')

    expect(result.hasOverlap).toBe(false)
  })
})
