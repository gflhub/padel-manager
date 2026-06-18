import { TESTIDS } from '@/lib/testids'
import { test, expect } from '../fixtures'

// TRI-03 mutates Clube B's trialEndsAt (no UI for this yet, only a fixture
// probe) and TRI-02 depends on Clube B still being expired — serial so they
// can't race each other regardless of worker count.
test.describe.configure({ mode: 'serial' })

test.describe('trial gate', () => {
  test('TRI-01: an active trial allows normal access', async ({ adminAPage }) => {
    await adminAPage.goto('/dashboard')
    await expect(adminAPage.getByTestId(TESTIDS.TRIAL_EXPIRED)).toHaveCount(0)
    await expect(adminAPage.getByTestId(TESTIDS.ADMIN_DASHBOARD)).toBeVisible()
  })

  test('TRI-02: an expired trial shows a clear blocking message, not a blank page', async ({ adminBPage }) => {
    await adminBPage.goto('/dashboard')
    await expect(adminBPage.getByTestId(TESTIDS.TRIAL_EXPIRED)).toBeVisible()
    await expect(adminBPage.getByTestId(TESTIDS.TRIAL_EXPIRED)).toContainText(/expirou/i)
    await expect(adminBPage.getByTestId(TESTIDS.ADMIN_DASHBOARD)).toBeVisible()
  })

  test('TRI-03: extending the trial restores access without forcing a new login', async ({ adminBPage }) => {
    const response = await adminBPage.request.post('/api/e2e-only/clubs/extend-trial', {
      data: { clubName: 'Clube B', days: 30 },
    })
    expect(response.ok()).toBeTruthy()

    await adminBPage.goto('/dashboard')
    await expect(adminBPage.getByTestId(TESTIDS.TRIAL_EXPIRED)).toHaveCount(0)
    await expect(adminBPage.getByTestId(TESTIDS.ADMIN_DASHBOARD)).toBeVisible()
  })
})
