import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from '../db/prisma'
import * as courtRepo from '../repositories/courts'
import * as reservationRepo from '../repositories/reservations'
import * as comandaRepo from '../repositories/comandas'
import { getComandaRevenueByClub } from '../repositories/payments'
import { requireClubContext } from '../auth/session'

/**
 * End-to-end smoke test against a real database connection:
 * create club -> create court -> reserve -> open comanda -> add item ->
 * counter payment (close comanda) -> dashboard aggregate query.
 *
 * Requires DATABASE_URL to point at a reachable MySQL instance with the
 * Prisma schema applied (see CONTRIBUTING / .env.local).
 */
describe('MVP smoke flow', () => {
  const suffix = Date.now().toString()
  let clubId: string
  let userId: string
  let profileId: string
  let courtId: string

  afterAll(async () => {
    if (clubId) await prisma.club.delete({ where: { id: clubId } }).catch(() => {})
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {})
  })

  it('creates a club, an owner, and a court', async () => {
    const club = await prisma.club.create({
      data: {
        name: `Smoke Test Club ${suffix}`,
        active: true,
        trialStartedAt: new Date(),
        trialEndsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    })
    clubId = club.id

    const user = await prisma.user.create({
      data: {
        email: `smoke-${suffix}@padelmanager.com`,
        passwordHash: 'not-a-real-hash',
        globalRole: 'CLIENT',
        profile: { create: { name: 'Smoke Test Owner', email: `smoke-${suffix}@padelmanager.com` } },
      },
      include: { profile: true },
    })
    userId = user.id
    profileId = user.profile!.id

    // No `userId` set on ClubStaff: this mirrors the real onboarding flow
    // (createOwnClub), which only ever fills `profileId`.
    await prisma.clubStaff.create({
      data: { clubId, profileId, role: 'OWNER', active: true },
    })

    // Validates Blocker 1: requireClubContext must resolve the club via
    // profileId, since real ClubStaff records never populate `userId`.
    const ctx = await requireClubContext(userId)
    expect(ctx).toEqual({ clubId, role: 'OWNER', userId })

    const courtResult = await courtRepo.createCourt(clubId, `Quadra Smoke ${suffix}`, 'padel', 120, 60)
    expect(courtResult.error).toBeNull()
    expect(courtResult.data).not.toBeNull()
    courtId = courtResult.data!.id
  })

  it('creates a reservation for the new court', async () => {
    const date = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const result = await reservationRepo.createReservation(
      profileId,
      clubId,
      courtId,
      date,
      '10:00',
      '11:00',
      60,
      [{ name: 'Smoke Player' }],
      120,
      120,
      120
    )

    expect(result.error).toBeNull()
    expect(result.data?.court_id).toBe(courtId)
    expect(result.data?.status).toBe('CONFIRMED')
  })

  it('opens a comanda, adds an item, and settles it via counter payment', async () => {
    const created = await comandaRepo.createComanda(clubId, 'Cliente Smoke', userId)
    expect(created.error).toBeNull()
    const comandaId = created.data!.id

    const item = await comandaRepo.addComandaItem(comandaId, 'Água', 2, 5)
    expect(item.error).toBeNull()

    const closed = await comandaRepo.closeComanda(comandaId, clubId, 'pix', userId)
    expect(closed.error).toBeNull()

    const comanda = await prisma.comanda.findUnique({ where: { id: comandaId }, include: { payments: true } })
    expect(comanda?.status).toBe('CLOSED')
    expect(comanda?.payments).toHaveLength(1)
    expect(comanda?.payments[0]?.method).toBe('PIX')
    expect(Number(comanda?.payments[0]?.amount)).toBe(10)
  })

  it('reflects the new club in dashboard-style aggregates', async () => {
    const reservationCount = await prisma.reservation.count({ where: { court: { clubId } } })
    const closedComandaCount = await prisma.comanda.count({ where: { clubId, status: 'CLOSED' } })

    expect(reservationCount).toBe(1)
    expect(closedComandaCount).toBe(1)

    // Validates Blocker 3: dashboard revenue aggregates reflect real data
    // instead of the hardcoded 0.
    const start = new Date(0)
    const end = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    const receitaComandas = await getComandaRevenueByClub(clubId, start, end)
    const receitaReservas = await reservationRepo.getReservationRevenueByClub(clubId, start, end)

    expect(receitaComandas).toBe(10)
    expect(receitaReservas).toBe(120)
  })
})
