import { test, expect } from '../fixtures'
import { courtForClub, reservationsForSlot } from '../test-data'

function tomorrowDateStr(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function yesterdayDateStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

test.describe('reservation conflict and past-date rejection', () => {
  test('RES-02: a conflicting slot is rejected, only one reservation persists @p0', async ({ clientAPage }) => {
    const court = await courtForClub(clientAPage.request, 'Clube A')
    const date = tomorrowDateStr()

    const first = await clientAPage.request.post('/api/e2e-only/reservations', {
      data: { court_id: court.id, date, start_time: '14:00', duration: 60, players: [] },
    })
    expect(first.ok()).toBeTruthy()
    const firstBody = await first.json()

    const second = await clientAPage.request.post('/api/e2e-only/reservations', {
      data: { court_id: court.id, date, start_time: '14:00', duration: 60, players: [] },
    })
    expect(second.status()).toBe(400)
    const secondBody = await second.json()
    expect(secondBody.error).toMatch(/indisponível|conflito/i)

    const reservationsForSlotResult = await reservationsForSlot(clientAPage.request, court.id, date, '14:00')
    expect(reservationsForSlotResult).toHaveLength(1)
    expect(reservationsForSlotResult[0].id).toBe(firstBody.data.id)
  })

  test('SEC-08: a past-date reservation is blocked on the server @p0', async ({ clientAPage }) => {
    const court = await courtForClub(clientAPage.request, 'Clube A')

    const response = await clientAPage.request.post('/api/e2e-only/reservations', {
      data: { court_id: court.id, date: yesterdayDateStr(), start_time: '10:00', duration: 60, players: [] },
    })
    expect(response.status()).toBeLessThan(500)
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/passad/i)
  })
})
