import { defineConfig, devices } from '@playwright/test'

const PORT = process.env.E2E_PORT ?? '3100'
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html'], ['github']] : 'html',
  use: {
    baseURL,
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      teardown: 'teardown',
    },
    {
      name: 'teardown',
      testMatch: /global\.teardown\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testIgnore: /design\/responsivo\.spec\.ts/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      dependencies: ['setup'],
      testMatch: /design\/responsivo\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run dev:test',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      E2E_TEST_MODE: '1',
      E2E_PORT: PORT,
    },
  },
})
