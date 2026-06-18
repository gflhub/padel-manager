import { test, expect } from '@playwright/test'
import { TESTIDS } from '@/lib/testids'
import { E2E_PASSWORD } from '../roles'

/**
 * These tests mutate auth state (logout bumps tokenVersion server-side,
 * invalidating every session for that user). They log in with a dedicated
 * `session.a@e2e.test` account seeded only for this purpose, never with the
 * shared per-role accounts in ../roles — those have prebuilt storageState
 * reused by every other spec, and bumping their tokenVersion would break it.
 */
test.describe('session', () => {
  test('AUTH-02: logout invalidates the session @p0', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId(TESTIDS.EMAIL_INPUT).fill('session.a@e2e.test')
    await page.getByTestId(TESTIDS.PASSWORD_INPUT).fill(E2E_PASSWORD)
    await page.getByTestId(TESTIDS.LOGIN_SUBMIT).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await page.getByTestId(TESTIDS.USER_MENU).click()
    await page.getByRole('menuitem', { name: /sair/i }).click()
    await expect(page).toHaveURL(/\/login/)

    const response = await page.goto('/dashboard')
    expect(response?.status()).toBeLessThan(500)
    await expect(page).toHaveURL(/\/login/)
  })

  test('AUTH-08: a token whose tokenVersion was invalidated is rejected @p0', async ({ page, context }) => {
    await page.goto('/login')
    await page.getByTestId(TESTIDS.EMAIL_INPUT).fill('session2.a@e2e.test')
    await page.getByTestId(TESTIDS.PASSWORD_INPUT).fill(E2E_PASSWORD)
    await page.getByTestId(TESTIDS.LOGIN_SUBMIT).click()
    await expect(page).toHaveURL(/\/dashboard/)

    const cookiesBeforeLogout = await context.cookies()
    const staleAccessToken = cookiesBeforeLogout.find((c) => c.name === 'accessToken')
    expect(staleAccessToken).toBeTruthy()

    await page.getByTestId(TESTIDS.USER_MENU).click()
    await page.getByRole('menuitem', { name: /sair/i }).click()
    await expect(page).toHaveURL(/\/login/)

    // Replay the pre-logout access token: its tokenVersion no longer matches
    // the user's current tokenVersion, so it must be rejected like a forged one.
    await context.addCookies([{ ...staleAccessToken!, value: staleAccessToken!.value }])

    const response = await page.goto('/dashboard')
    expect(response?.status()).toBeLessThan(500)
    await expect(page).toHaveURL(/\/login/)
  })
})
