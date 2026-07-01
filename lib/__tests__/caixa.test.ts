import { describe, it, expect, vi, beforeEach } from 'vitest'

const paymentFindMany = vi.fn()
const paymentAggregate = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    payment: {
      findMany: (...args: unknown[]) => paymentFindMany(...args),
      aggregate: (...args: unknown[]) => paymentAggregate(...args),
    },
  },
}))

import { getCaixaReport, getComandaRevenueByClub } from '../repositories/payments'

// ---------------------------------------------------------------------------
// getCaixaReport — queries the Payment table, so RECEIVABLE comandas
// (which have no Payment records until settled) are naturally excluded.
// ---------------------------------------------------------------------------

describe('getCaixaReport', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('totals only PAID comanda amounts (RECEIVABLE comandas have no Payment records)', async () => {
    // 2 PAID payments; the RECEIVABLE comanda has no payment entry at all
    paymentFindMany.mockResolvedValue([
      { method: 'CASH', amount: 5000, paidAt: new Date() },
      { method: 'PIX', amount: 5000, paidAt: new Date() },
    ])

    const result = await getCaixaReport('club-a', '2024-01-15')

    expect(result.error).toBeNull()
    expect(result.data!.totalAmount).toBe(10000)
    expect(result.data!.totalTransactions).toBe(2)
  })

  it('returns zero revenue when club has only RECEIVABLE comandas (no payments)', async () => {
    paymentFindMany.mockResolvedValue([])

    const result = await getCaixaReport('club-a', '2024-01-15')

    expect(result.error).toBeNull()
    expect(result.data!.totalAmount).toBe(0)
  })

  it('scopes query to the given clubId via comanda relation', async () => {
    paymentFindMany.mockResolvedValue([])

    await getCaixaReport('club-a', '2024-01-15')

    expect(paymentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ comanda: { clubId: 'club-a' } }) })
    )
  })
})

// ---------------------------------------------------------------------------
// getComandaRevenueByClub — aggregates Payment.amount, so RECEIVABLE
// comandas (no Payment record) contribute nothing to the total.
// ---------------------------------------------------------------------------

describe('getComandaRevenueByClub', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns sum of Payment amounts (RECEIVABLE comandas excluded because they have no payments)', async () => {
    paymentAggregate.mockResolvedValue({ _sum: { amount: 10000 } })

    const revenue = await getComandaRevenueByClub('club-a', new Date(0), new Date())

    expect(revenue).toBe(10000)
  })

  it('returns 0 when no payments exist', async () => {
    paymentAggregate.mockResolvedValue({ _sum: { amount: null } })

    const revenue = await getComandaRevenueByClub('club-a', new Date(0), new Date())

    expect(revenue).toBe(0)
  })

  it('scopes aggregate to the given clubId', async () => {
    paymentAggregate.mockResolvedValue({ _sum: { amount: null } })

    await getComandaRevenueByClub('club-a', new Date(0), new Date())

    expect(paymentAggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ comanda: { clubId: 'club-a' } }) })
    )
  })
})
