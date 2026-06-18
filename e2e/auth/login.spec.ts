import { test, expect } from '@playwright/test'
import { TESTIDS } from '@/lib/testids'
import { E2E_PASSWORD } from '../roles'

test.describe('login', () => {
  test('AUTH-01: routes each role to its area @p0', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId(TESTIDS.EMAIL_INPUT).fill('admin.a@e2e.test')
    await page.getByTestId(TESTIDS.PASSWORD_INPUT).fill(E2E_PASSWORD)
    await page.getByTestId(TESTIDS.LOGIN_SUBMIT).click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('AUTH-01: client login lands on the client area @p0', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId(TESTIDS.EMAIL_INPUT).fill('client.a@e2e.test')
    await page.getByTestId(TESTIDS.PASSWORD_INPUT).fill(E2E_PASSWORD)
    await page.getByTestId(TESTIDS.LOGIN_SUBMIT).click()
    await expect(page).toHaveURL(/\/home/)
  })

  test('AUTH-05: wrong password shows a generic error and stays on /login @p0', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId(TESTIDS.EMAIL_INPUT).fill('admin.a@e2e.test')
    await page.getByTestId(TESTIDS.PASSWORD_INPUT).fill('wrong-password')
    await page.getByTestId(TESTIDS.LOGIN_SUBMIT).click()

    await expect(page.getByTestId(TESTIDS.AUTH_ERROR)).toHaveText('Credenciais inválidas')
    await expect(page).toHaveURL(/\/login/)
  })

  test('AUTH-05/AUTH-06: unknown email shows the same generic error (no enumeration) @p0', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId(TESTIDS.EMAIL_INPUT).fill('does-not-exist@e2e.test')
    await page.getByTestId(TESTIDS.PASSWORD_INPUT).fill('whatever123')
    await page.getByTestId(TESTIDS.LOGIN_SUBMIT).click()

    await expect(page.getByTestId(TESTIDS.AUTH_ERROR)).toHaveText('Credenciais inválidas')
    await expect(page).toHaveURL(/\/login/)
  })

  test('AUTH-07: submitting an empty form does not fire a request', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId(TESTIDS.LOGIN_SUBMIT).click()

    // Native required-field validation blocks the submit handler entirely.
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByTestId(TESTIDS.AUTH_ERROR)).toHaveCount(0)
    const emailValidity = await page.getByTestId(TESTIDS.EMAIL_INPUT).evaluate((el: HTMLInputElement) => el.validity.valid)
    expect(emailValidity).toBe(false)
  })

  test('AUTH-03: an expired access token is silently refreshed @p0', async ({ page, context }) => {
    const response = await context.request.post('/api/e2e-only/login?expired=1', {
      data: { email: 'admin.a@e2e.test', password: E2E_PASSWORD },
    })
    expect(response.ok()).toBeTruthy()

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)

    const cookies = await context.cookies()
    expect(cookies.find((c) => c.name === 'accessToken')?.value).toBeTruthy()
  })

  test('AUTH-04: a logged-in session survives a page reload', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId(TESTIDS.EMAIL_INPUT).fill('admin.a@e2e.test')
    await page.getByTestId(TESTIDS.PASSWORD_INPUT).fill(E2E_PASSWORD)
    await page.getByTestId(TESTIDS.LOGIN_SUBMIT).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await page.reload()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('AUTH-09: tampered access token falls back to login without a 500 @p0', async ({ page, context, baseURL }) => {
    await page.goto('/login')
    await context.addCookies([
      {
        name: 'accessToken',
        value: 'this.is.not-a-valid-jwt',
        url: baseURL ?? 'http://localhost:3100',
      },
    ])

    const response = await page.goto('/dashboard')
    expect(response?.status()).toBeLessThan(500)
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toContainText('Application error')
  })
})
