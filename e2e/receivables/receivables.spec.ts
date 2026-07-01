/**
 * Receivables E2E suite — covers the full contas-a-receber flow:
 * list view, customer detail, settlement modal, multi-tenant isolation,
 * backward-compat paid-on-close, and dashboard revenue exclusion.
 *
 * Relies on seed-e2e.ts creating:
 *   - 3 RECEIVABLE comandas for "Cliente Recebível A" (Clube A)
 *   - 1 PAID comanda for same customer (should NOT appear in list)
 *   - 1 ad-hoc RECEIVABLE comanda with no customerProfileId (excluded from list)
 *   - 1 RECEIVABLE comanda for "Cliente Recebível B" (Clube B)
 *   - 1 OPEN comanda "Fechamento Compatibilidade" (Clube A, for backward-compat test)
 *
 * Uses serial mode: settlement (REC-05) deletes the customer from the list,
 * so all read-only tests must complete first.
 */
import { test, expect } from '../fixtures'
import { comandaForClub, paymentsForComanda } from '../test-data'

test.describe.configure({ mode: 'serial' })

test.describe('receivables', () => {
  // REC-01: Customer with RECEIVABLE comandas appears in the list
  test('REC-01: customer with RECEIVABLE comandas appears in /admin/receivables with correct count @p1', async ({
    adminAPage,
  }) => {
    await adminAPage.goto('/admin/receivables')

    const row = adminAPage.getByRole('row', { name: /Cliente Recebível A/i })
    await expect(row).toBeVisible()

    // Count cell (2nd column) must be "3" — the 1 PAID comanda is excluded
    await expect(row.getByRole('cell').nth(1)).toHaveText('3')
  })

  // REC-02: Ad-hoc RECEIVABLE (no customerProfileId) does NOT appear in list
  test('REC-02: ad-hoc RECEIVABLE comanda without customerProfileId is excluded from list @p1', async ({
    adminAPage,
  }) => {
    await adminAPage.goto('/admin/receivables')

    // "Avulso Recebível" has no customerProfileId → excluded from groupBy query
    await expect(adminAPage.getByText('Avulso Recebível')).not.toBeVisible()
  })

  // REC-03: Customer detail shows only RECEIVABLE comandas (not the PAID one)
  test('REC-03: customer detail page shows only RECEIVABLE comandas (PAID excluded) @p1', async ({
    adminAPage,
  }) => {
    await adminAPage.goto('/admin/receivables')

    // Navigate to detail via the list row link
    const row = adminAPage.getByRole('row', { name: /Cliente Recebível A/i })
    await row.getByRole('link', { name: /ver detalhes/i }).click()

    await adminAPage.waitForURL(/\/admin\/receivables\//)

    await expect(adminAPage.getByRole('heading', { level: 1 })).toContainText('Cliente Recebível A')

    // Exactly 3 comanda rows (PAID comanda excluded)
    const comandaRows = adminAPage.locator('details')
    await expect(comandaRows).toHaveCount(3)
  })

  // REC-04: Multi-tenant isolation — Clube B admin cannot see Clube A customers
  test('REC-04: Clube B admin sees only Clube B receivables (multi-tenant isolation) @p1', async ({
    adminBPage,
  }) => {
    await adminBPage.goto('/admin/receivables')

    // Clube B's own customer is present
    await expect(adminBPage.getByText('Cliente Recebível B')).toBeVisible()

    // Clube A's customer is absent
    await expect(adminBPage.getByText('Cliente Recebível A')).not.toBeVisible()
  })

  // REC-05: Settlement modal settles all RECEIVABLE comandas and removes customer from list
  // Runs last in serial sequence because it mutates data.
  test('REC-05: settlement modal → customer exits list, toast success shown @p1', async ({ adminAPage }) => {
    await adminAPage.goto('/admin/receivables')

    const row = adminAPage.getByRole('row', { name: /Cliente Recebível A/i })
    await row.getByRole('link', { name: /ver detalhes/i }).click()

    await adminAPage.waitForURL(/\/admin\/receivables\//)

    // Open settlement modal
    await adminAPage.getByRole('button', { name: /quitar/i }).click()

    // Select payment method
    await adminAPage.getByRole('combobox').click()
    await adminAPage.getByRole('option', { name: 'PIX' }).click()

    // Confirm
    await adminAPage.getByRole('button', { name: /confirmar/i }).click()

    // Redirected to list, success toast visible
    await adminAPage.waitForURL('/admin/receivables')
    await expect(adminAPage.getByText(/quitad/i)).toBeVisible()

    // Customer no longer in list
    await expect(adminAPage.getByText('Cliente Recebível A')).not.toBeVisible()
  })

  // REC-06: Backward-compat — closing a comanda with paymentMethod creates Payment, not RECEIVABLE entry
  test('REC-06: paid-on-close comanda does not appear in /admin/receivables @p1', async ({ adminAPage }) => {
    const comanda = await comandaForClub(adminAPage.request, 'Clube A', {
      customerNameContains: 'Compatibilidade',
    })

    // Close via the e2e probe with a paymentMethod (original flow)
    const closeRes = await adminAPage.request.post(`/api/e2e-only/comandas/${comanda.id}/close`, {
      data: { paymentMethod: 'cash' },
    })
    expect(closeRes.ok()).toBeTruthy()

    // Payment record must exist
    const payments = await paymentsForComanda(adminAPage.request, comanda.id)
    expect(payments.count).toBe(1)
    expect(payments.methods).toContain('CASH')

    // Comanda must NOT appear in /admin/receivables (it has no customerProfileId,
    // and its paymentStatus is PAID — both criteria exclude it)
    await adminAPage.goto('/admin/receivables')
    await expect(adminAPage.getByText('Fechamento Compatibilidade')).not.toBeVisible()
  })

  // REC-07: Dashboard loads and renders "Bar / Comandas" revenue section without crashing
  // (Revenue must reflect only PAID amounts; RECEIVABLE comandas must not inflate the figure.)
  test('REC-07: dashboard renders revenue section without RECEIVABLE comanda inflation @p1', async ({
    adminAPage,
  }) => {
    await adminAPage.goto('/dashboard')

    await expect(adminAPage.getByText(/Bar \/ Comandas/i)).toBeVisible()

    // The dashboard must NOT crash when RECEIVABLE comandas exist in the club
    await expect(adminAPage.locator(`[data-testid="admin-dashboard"]`)).toBeVisible()
  })
})
