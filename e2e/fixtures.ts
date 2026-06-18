import { test as base, expect, type Browser, type Page } from '@playwright/test'
import { authFile, type SeededRole } from './roles'

interface RoleFixtures {
  adminAPage: Page
  staffAPage: Page
  clientAPage: Page
  adminBPage: Page
  staffBPage: Page
}

function authenticatedPage(role: SeededRole['key']) {
  return async ({ browser }: { browser: Browser }, use: (page: Page) => Promise<void>) => {
    const context = await browser.newContext({ storageState: authFile(role) })
    const page = await context.newPage()
    await use(page)
    await context.close()
  }
}

export const test = base.extend<RoleFixtures>({
  adminAPage: authenticatedPage('admin-a'),
  staffAPage: authenticatedPage('staff-a'),
  clientAPage: authenticatedPage('client-a'),
  adminBPage: authenticatedPage('admin-b'),
  staffBPage: authenticatedPage('staff-b'),
})

export { expect }
