import { TESTIDS } from '@/lib/testids'
import { test, expect } from '../fixtures'

test.describe('UI-12: mobile collapses the sidebar into a hamburger menu', () => {
  test('the desktop sidebar is hidden and a mobile menu toggle is shown instead', async ({ adminAPage }) => {
    await adminAPage.goto('/dashboard')

    await expect(adminAPage.getByTestId(TESTIDS.SIDEBAR)).toBeHidden()
    await expect(adminAPage.getByTestId(TESTIDS.MOBILE_MENU_TOGGLE)).toBeVisible()

    // A few px of slack for scrollbar-gutter/rounding — this is checking
    // for gross horizontal overflow (e.g. an unconstrained flex child),
    // not pixel-perfect layout.
    const viewportWidth = adminAPage.viewportSize()?.width ?? 0
    const bodyScrollWidth = await adminAPage.evaluate(() => document.documentElement.scrollWidth)
    expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth + 16)
  })
})
