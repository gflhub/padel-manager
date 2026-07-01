import { describe, it, expect, vi, beforeEach } from 'vitest'

const comandaFindUnique = vi.fn()
const transaction = vi.fn()
const paymentCreate = vi.fn()
const comandaUpdate = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    comanda: {
      findUnique: (...args: unknown[]) => comandaFindUnique(...args),
      update: (...args: unknown[]) => comandaUpdate(...args),
    },
    payment: {
      create: (...args: unknown[]) => paymentCreate(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}))

import { closeComanda } from '../repositories/comandas'

describe('closeComanda', () => {
  beforeEach(() => {
    comandaFindUnique.mockReset()
    transaction.mockReset().mockResolvedValue([])
    paymentCreate.mockReset()
    comandaUpdate.mockReset()
  })

  it('rejects closing an ad-hoc comanda (no customerProfileId) via RECEIVABLE path', async () => {
    comandaFindUnique.mockResolvedValue({
      id: 'comanda-1',
      clubId: 'club-a',
      total: 100,
      status: 'OPEN',
      customerProfileId: null,
    })

    const result = await closeComanda('comanda-1', 'club-a', 'user-1')

    expect(result.error).toMatch(/avulsa/)
    expect(transaction).not.toHaveBeenCalled()
  })

  it('enforces multi-tenant isolation: club A cannot close a comanda belonging to club B', async () => {
    comandaFindUnique.mockResolvedValue({
      id: 'comanda-1',
      clubId: 'club-b',
      total: 100,
    })

    const result = await closeComanda('comanda-1', 'club-a', 'user-1', 'cash')

    expect(result.error).toBe('Comanda não encontrada')
    expect(transaction).not.toHaveBeenCalled()
  })

  it('returns not-found when the comanda does not exist', async () => {
    comandaFindUnique.mockResolvedValue(null)

    const result = await closeComanda('missing-comanda', 'club-a', 'user-1', 'cash')

    expect(result.error).toBe('Comanda não encontrada')
  })

  it('records the payment and closes the comanda for the owning club', async () => {
    comandaFindUnique.mockResolvedValue({
      id: 'comanda-1',
      clubId: 'club-a',
      total: 150,
      status: 'OPEN',
    })

    const result = await closeComanda('comanda-1', 'club-a', 'user-1', 'cash')

    expect(result.error).toBeNull()
    expect(transaction).toHaveBeenCalledTimes(1)
  })

  it('rejects closing a comanda that is already closed, without duplicating the payment', async () => {
    comandaFindUnique.mockResolvedValue({
      id: 'comanda-1',
      clubId: 'club-a',
      total: 150,
      status: 'CLOSED',
    })

    const result = await closeComanda('comanda-1', 'club-a', 'user-1', 'cash')

    expect(result.error).toBe('Comanda já está fechada')
    expect(transaction).not.toHaveBeenCalled()
  })
})
