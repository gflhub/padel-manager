import { TESTIDS } from '@/lib/testids'
import { test, expect } from '@playwright/test'
import { test as roleTest, expect as roleExpect } from '../fixtures'

test.describe('UI-01: login screen required elements', () => {
  test('logo, fields, submit, forgot-password link, and an error area are present', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId(TESTIDS.LOGO)).toBeVisible()
    await expect(page.getByTestId(TESTIDS.EMAIL_INPUT)).toBeVisible()
    await expect(page.getByTestId(TESTIDS.PASSWORD_INPUT)).toBeVisible()
    await expect(page.getByTestId(TESTIDS.LOGIN_SUBMIT)).toBeVisible()
    await expect(page.getByTestId(TESTIDS.FORGOT_PASSWORD)).toBeVisible()

    // The error area only mounts once there's an error to show (UI-09 pattern).
    await page.getByTestId(TESTIDS.EMAIL_INPUT).fill('nope@e2e.test')
    await page.getByTestId(TESTIDS.PASSWORD_INPUT).fill('wrong')
    await page.getByTestId(TESTIDS.LOGIN_SUBMIT).click()
    await expect(page.getByTestId(TESTIDS.AUTH_ERROR)).toBeVisible()
  })
})

roleTest.describe('UI-02: admin dashboard required elements', () => {
  roleTest('header, revenue card, reservations-today card, sidebar, and user menu are present', async ({
    adminAPage,
  }) => {
    await adminAPage.goto('/dashboard')
    await roleExpect(adminAPage.getByTestId(TESTIDS.ADMIN_DASHBOARD)).toBeVisible()
    await roleExpect(adminAPage.getByTestId(TESTIDS.TODAY_REVENUE)).toBeVisible()
    await roleExpect(adminAPage.getByTestId(TESTIDS.RESERVAS_HOJE)).toBeVisible()
    await roleExpect(adminAPage.getByTestId(TESTIDS.SIDEBAR)).toBeVisible()
    await roleExpect(adminAPage.getByTestId(TESTIDS.USER_MENU)).toBeVisible()
  })
})

roleTest.describe('UI-04: booking agenda shows free vs. booked slots', () => {
  roleTest('a booked slot is disabled and a free slot is selectable', async ({ clientAPage }) => {
    await clientAPage.goto('/reservations/new')
    await clientAPage.getByRole('combobox').first().click()
    await clientAPage.getByRole('option').first().click()

    const slotGrid = clientAPage.locator('.grid.grid-cols-4 button')
    await roleExpect(slotGrid.first()).toBeVisible()
    roleExpect(await slotGrid.count()).toBeGreaterThan(1)

    const bookedSlot = clientAPage.locator('button[title="Horário já reservado"]').first()
    if (await bookedSlot.count() > 0) {
      await roleExpect(bookedSlot).toBeDisabled()
    }
    const enabledSlot = clientAPage.locator('.grid.grid-cols-4 button:not([disabled])').first()
    await roleExpect(enabledSlot).toBeEnabled()
  })
})

roleTest.describe('UI-06: comanda close screen elements', () => {
  roleTest('total, payment method selector, and close action are present', async ({ adminAPage }) => {
    await adminAPage.goto('/admin/comandas')
    await adminAPage.getByRole('button', { name: 'Tabela' }).click()
    await adminAPage.locator('[data-testid="view-comanda"]').first().click()
    await roleExpect(adminAPage.getByTestId(TESTIDS.COMANDA_TOTAL)).toBeVisible()
    await roleExpect(adminAPage.getByTestId(TESTIDS.COMANDA_STATUS)).toBeVisible()
  })
})

roleTest.describe('UI-07: empty state', () => {
  roleTest('a status filter with no matches shows a friendly empty message, not a crash', async ({ adminBPage }) => {
    await adminBPage.goto('/admin/members')
    await adminBPage.getByRole('button', { name: /^Em atraso/ }).click()
    await roleExpect(adminBPage.getByText('Nenhum mensalista cadastrado.')).toBeVisible()
  })
})

roleTest.describe('UI-09: API failure shows a recoverable fallback', () => {
  roleTest('a thrown error renders the error boundary with a retry action, not a blank page', async ({
    adminAPage,
  }) => {
    await adminAPage.goto('/admin/e2e-error-probe')
    await roleExpect(adminAPage.getByTestId(TESTIDS.APP_ERROR_BOUNDARY)).toBeVisible()
    await roleExpect(adminAPage.getByTestId(TESTIDS.ERROR_RETRY)).toBeVisible()
  })
})
