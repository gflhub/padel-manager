import { TESTIDS } from '@/lib/testids'
import { test, expect } from '../fixtures'

test.describe('role-based access gating', () => {
  test('RBAC-01: client cannot reach the admin area @p0', async ({ clientAPage }) => {
    const response = await clientAPage.goto('/dashboard')
    expect(response?.status()).toBeLessThan(500)
    await expect(clientAPage).not.toHaveURL(/\/dashboard/)
    await expect(clientAPage.getByTestId(TESTIDS.ADMIN_DASHBOARD)).toHaveCount(0)
  })

  test('RBAC-02: staff cannot reach club settings @p0', async ({ staffAPage }) => {
    await staffAPage.goto('/admin/settings')
    await expect(staffAPage).toHaveURL(/\/dashboard/)
  })

  test('RBAC-03: client has no comanda controls and direct invocation is rejected @p0', async ({
    clientAPage,
  }) => {
    // The client can't even reach /admin/comandas (redirected away by the layout).
    const response = await clientAPage.goto('/admin/comandas')
    expect(response?.status()).toBeLessThan(500)
    await expect(clientAPage).not.toHaveURL(/\/admin\/comandas/)

    // And invoking the close action directly (bypassing the UI) is still rejected.
    const probe = await clientAPage.request.post('/api/e2e-only/comandas/00000000-0000-0000-0000-000000000000/close', {
      data: { paymentMethod: 'pix' },
    })
    expect([401, 403, 404]).toContain(probe.status())
  })

  test('RBAC-04: navigation reflects role — staff has no settings link, client has no admin nav at all @p0', async ({
    staffAPage,
    adminAPage,
    clientAPage,
  }) => {
    await staffAPage.goto('/dashboard')
    await expect(staffAPage.getByTestId(TESTIDS.NAV_SETTINGS)).toHaveCount(0)
    await expect(staffAPage.getByTestId(TESTIDS.NAV_MENSALISTAS)).toBeVisible()

    await adminAPage.goto('/dashboard')
    await expect(adminAPage.getByTestId(TESTIDS.NAV_SETTINGS)).toBeVisible()

    await clientAPage.goto('/home')
    await expect(clientAPage.getByTestId(TESTIDS.NAV_SETTINGS)).toHaveCount(0)
    await expect(clientAPage.getByTestId(TESTIDS.NAV_MENSALISTAS)).toHaveCount(0)
  })
})
