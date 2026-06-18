import { test, expect } from '../fixtures'
import { courtForClub, reservationStatus } from '../test-data'

function daysFromNowStr(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

test.describe('create and cancel reservations', () => {
  test('RES-01: a valid reservation is created with the correct price @p0', async ({ clientAPage }) => {
    const court = await courtForClub(clientAPage.request, 'Clube A')
    const date = daysFromNowStr(2)

    const response = await clientAPage.request.post('/api/e2e-only/reservations', {
      data: { court_id: court.id, date, start_time: '16:00', duration: 60, players: [{ name: 'Cliente A' }] },
    })
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.data.id).toBeTruthy()
    expect(body.data.total_price).toBe(court.pricePerSlot)

    const stored = await reservationStatus(clientAPage.request, body.data.id)
    expect(stored.status).toBe('CONFIRMED')

    await clientAPage.goto('/reservations')
    await expect(clientAPage.getByText('16:00').first()).toBeVisible()
  })

  test('RES-03: cancelling a reservation frees the slot @p0', async ({ clientAPage }) => {
    const court = await courtForClub(clientAPage.request, 'Clube A')
    const date = daysFromNowStr(3)

    const created = await clientAPage.request.post('/api/e2e-only/reservations', {
      data: { court_id: court.id, date, start_time: '17:00', duration: 60, players: [] },
    })
    expect(created.ok()).toBeTruthy()
    const { data } = await created.json()

    const cancelled = await clientAPage.request.delete('/api/e2e-only/reservations', {
      data: { id: data.id },
    })
    expect(cancelled.ok()).toBeTruthy()

    const stored = await reservationStatus(clientAPage.request, data.id)
    expect(stored.status).toBe('CANCELLED')

    // The slot is free again: booking it once more must succeed.
    const rebooked = await clientAPage.request.post('/api/e2e-only/reservations', {
      data: { court_id: court.id, date, start_time: '17:00', duration: 60, players: [] },
    })
    expect(rebooked.ok()).toBeTruthy()
  })
})
