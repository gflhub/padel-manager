import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'

test.describe('UI-16: no serious/critical accessibility violations', () => {
  test('login page', async ({ page }) => {
    await page.goto('/login')
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
  })
})
