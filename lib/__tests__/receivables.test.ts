import { describe, it, expect, vi, beforeEach } from 'vitest'

const groupBy = vi.fn()
const profileFindMany = vi.fn()
const transaction = vi.fn()

// ponytail: tx mock reused across tests — reset in beforeEach
const tx = {
  comanda: { findMany: vi.fn(), updateMany: vi.fn() },
  settlement: { create: vi.fn() },
  payment: { createMany: vi.fn() },
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    comanda: { groupBy: (...args: unknown[]) => groupBy(...args) },
    profile: { findMany: (...args: unknown[]) => profileFindMany(...args) },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}))

import { getReceivablesByCustomer, settleCustomerReceivables } from '../repositories/receivables'
import { PaymentMethod } from '../generated/prisma/enums'

// ---------------------------------------------------------------------------
// getReceivablesByCustomer
// ---------------------------------------------------------------------------

describe('getReceivablesByCustomer', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns empty array when club has no RECEIVABLE comandas', async () => {
    groupBy.mockResolvedValue([])

    const result = await getReceivablesByCustomer('club-a')

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('groups by customerProfileId with count and BRL total', async () => {
    groupBy.mockResolvedValue([
      { customerProfileId: 'profile-a', _count: { id: 3 }, _sum: { total: 3000 } },
      { customerProfileId: 'profile-b', _count: { id: 2 }, _sum: { total: 2000 } },
    ])
    profileFindMany.mockResolvedValue([
      { id: 'profile-a', name: 'Cliente A' },
      { id: 'profile-b', name: 'Cliente B' },
    ])

    const result = await getReceivablesByCustomer('club-a')

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(2)
    expect(result.data![0]).toMatchObject({ customerProfileId: 'profile-a', comandaCount: 3, totalAmount: 3000 })
    expect(result.data![1]).toMatchObject({ customerProfileId: 'profile-b', comandaCount: 2, totalAmount: 2000 })
  })

  it('scopes the groupBy query to the given clubId', async () => {
    groupBy.mockResolvedValue([])

    await getReceivablesByCustomer('club-a')

    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clubId: 'club-a' }) })
    )
  })
})

// ---------------------------------------------------------------------------
// settleCustomerReceivables
// ---------------------------------------------------------------------------

describe('settleCustomerReceivables', () => {
  const settlementBase = {
    id: 's1',
    clubId: 'club-a',
    customerProfileId: 'profile-a',
    method: PaymentMethod.CASH,
    comandasCount: 3,
    settledBy: 'staff-a',
    invoiceIssued: false,
    createdAt: new Date(),
    settledAt: new Date(),
  }

  beforeEach(() => {
    vi.resetAllMocks()
    // ponytail: re-wire transaction callback after resetAllMocks clears it
    transaction.mockImplementation(async (cb: (t: typeof tx) => unknown) => cb(tx))
  })

  it('happy path: 3 RECEIVABLE comandas → 1 Settlement, 3 Payments, all marked PAID', async () => {
    const comandas = [
      { id: 'c1', total: 1000 },
      { id: 'c2', total: 1000 },
      { id: 'c3', total: 1000 },
    ]
    tx.comanda.findMany.mockResolvedValue(comandas)
    tx.settlement.create.mockResolvedValue({ ...settlementBase, totalAmount: 3000 })
    tx.payment.createMany.mockResolvedValue({ count: 3 })
    tx.comanda.updateMany.mockResolvedValue({ count: 3 })

    const result = await settleCustomerReceivables('club-a', 'profile-a', PaymentMethod.CASH, 'staff-a')

    expect(result.error).toBeNull()
    expect(result.data!.comandasCount).toBe(3)
    expect(result.data!.totalAmount).toBe(3000)

    expect(tx.settlement.create).toHaveBeenCalledTimes(1)
    expect(tx.payment.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([expect.objectContaining({ comandaId: 'c1' })]),
      })
    )
    expect(tx.comanda.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentStatus: 'PAID' }) })
    )
  })

  it('returns error when customer has no RECEIVABLE comandas (already settled)', async () => {
    tx.comanda.findMany.mockResolvedValue([])

    const result = await settleCustomerReceivables('club-a', 'profile-a', PaymentMethod.CASH, 'staff-a')

    expect(result.data).toBeNull()
    expect(result.error).toMatch(/nenhum receb/i)
    expect(tx.settlement.create).not.toHaveBeenCalled()
  })

  it('idempotency: second concurrent call (updateMany returns 0) yields an error, no duplicate Settlement', async () => {
    // Simulate race: findMany sees 1 comanda, but updateMany finds 0 (already flipped by peer)
    tx.comanda.findMany.mockResolvedValue([{ id: 'c1', total: 1000 }])
    tx.settlement.create.mockResolvedValue({ ...settlementBase, comandasCount: 1, totalAmount: 1000 })
    tx.payment.createMany.mockResolvedValue({ count: 0 })
    tx.comanda.updateMany.mockResolvedValue({ count: 0 }) // mismatch triggers guard

    const result = await settleCustomerReceivables('club-a', 'profile-a', PaymentMethod.CASH, 'staff-a')

    expect(result.data).toBeNull()
    expect(result.error).toMatch(/já foi quitada/i)
  })

  it('sequential calls: second call settles 0 comandas because none are RECEIVABLE anymore', async () => {
    // First call succeeds
    tx.comanda.findMany.mockResolvedValueOnce([{ id: 'c1', total: 1000 }])
    tx.settlement.create.mockResolvedValueOnce({ ...settlementBase, comandasCount: 1, totalAmount: 1000 })
    tx.payment.createMany.mockResolvedValueOnce({ count: 1 })
    tx.comanda.updateMany.mockResolvedValueOnce({ count: 1 })

    const first = await settleCustomerReceivables('club-a', 'profile-a', PaymentMethod.CASH, 'staff-a')
    expect(first.error).toBeNull()

    // Second call: no RECEIVABLE comandas left
    tx.comanda.findMany.mockResolvedValueOnce([])

    const second = await settleCustomerReceivables('club-a', 'profile-a', PaymentMethod.CASH, 'staff-a')
    expect(second.data).toBeNull()
    expect(second.error).toMatch(/nenhum receb/i)
  })
})
