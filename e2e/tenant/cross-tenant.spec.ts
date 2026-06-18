import { test, expect } from '../fixtures'
import { reservationForClub, reservationStatus, comandaForClub, comandaStatus } from '../test-data'

test.describe('multi-tenant isolation and unauthorized actions', () => {
  test('SEC-01: cross-tenant read is blocked @p0', async ({ staffAPage, staffBPage }) => {
    const clubAReservation = await reservationForClub(staffAPage.request, 'Clube A')

    const response = await staffBPage.request.get(`/api/e2e-only/reservations/${clubAReservation.id}`)
    expect(response.status()).toBe(404)

    const body = await response.json()
    expect(JSON.stringify(body)).not.toContain('Clube A')
  })

  test('SEC-02: cross-tenant mutation (IDOR) is blocked @p0', async ({ staffAPage, staffBPage }) => {
    const clubAReservation = await reservationForClub(staffAPage.request, 'Clube A')

    const response = await staffBPage.request.post(
      `/api/e2e-only/reservations/${clubAReservation.id}/status`,
      { data: { status: 'CANCELLED' } }
    )
    expect([403, 404]).toContain(response.status())

    const after = await reservationStatus(staffAPage.request, clubAReservation.id)
    expect(after.status).not.toBe('CANCELLED')
  })

  test('SEC-03: privilege escalation by a client is blocked @p0', async ({ clientAPage }) => {
    const response = await clientAPage.request.post('/api/e2e-only/courts', {
      data: { name: 'Quadra Hackeada SEC-03', court_type: 'padel', price_per_slot: 1, duration_slot: 60 },
    })
    expect(response.status()).toBe(403)

    const body = await response.json()
    expect(body.error).toMatch(/not a staff member/i)

    const created = await clientAPage.request.get('/api/e2e-only/fixtures?resource=court-by-name&name=Quadra+Hackeada+SEC-03')
    const createdBody = await created.json()
    expect(createdBody.data).toBeNull()
  })

  test('SEC-04: IDOR on comanda close across clubs is blocked @p0', async ({ staffAPage, staffBPage }) => {
    const clubAComanda = await comandaForClub(staffAPage.request, 'Clube A', { customerNameExcludes: 'Fechamento' })

    const response = await staffBPage.request.post(`/api/e2e-only/comandas/${clubAComanda.id}/close`, {
      data: { paymentMethod: 'pix' },
    })
    expect([403, 404]).toContain(response.status())

    const after = await comandaStatus(staffAPage.request, clubAComanda.id)
    expect(after.status).toBe('OPEN')
  })

  test('SEC-05: unauthenticated request is rejected without a 500 @p0', async ({ staffAPage, playwright, baseURL }) => {
    const clubAReservation = await reservationForClub(staffAPage.request, 'Clube A')
    const anonymous = await playwright.request.newContext({ baseURL })

    const response = await anonymous.get(`/api/e2e-only/reservations/${clubAReservation.id}`)
    expect(response.status()).toBe(401)

    await anonymous.dispose()
  })

  test('SEC-08: malformed payload (invalid status) does not 500 @p0', async ({ staffAPage }) => {
    const clubAReservation = await reservationForClub(staffAPage.request, 'Clube A')

    const response = await staffAPage.request.post(
      `/api/e2e-only/reservations/${clubAReservation.id}/status`,
      { data: { status: 'not-a-real-status', extra: { nested: true } } }
    )
    expect(response.status()).toBeLessThan(500)
  })
})
