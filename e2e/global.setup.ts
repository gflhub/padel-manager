import { test as setup, expect } from '@playwright/test'
import { resetDb, seed } from './db'
import { ROLES, E2E_PASSWORD, authFile } from './roles'

// A single test, not two: `fullyParallel` can otherwise schedule "authenticate"
// on a different worker before "reset and seed" finishes, racing the DB.
setup('reset, seed, and authenticate every seeded role', async ({ browser }) => {
  resetDb()
  seed()

  for (const role of ROLES) {
    const context = await browser.newContext()

    const response = await context.request.post('/api/e2e-only/login', {
      data: { email: role.email, password: E2E_PASSWORD },
    })
    expect(response.ok(), `login failed for ${role.email}: ${await response.text()}`).toBeTruthy()

    await context.storageState({ path: authFile(role.key) })
    await context.close()
  }
})
