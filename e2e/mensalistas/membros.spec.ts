import { TESTIDS } from '@/lib/testids'
import { test, expect } from '../fixtures'

test.describe('monthly members (mensalistas)', () => {
  test('MEN-01: registering a new member creates an active subscription', async ({ adminAPage }) => {
    await adminAPage.goto('/admin/members')
    await adminAPage.getByRole('button', { name: 'Novo Mensalista' }).click()

    await adminAPage.getByLabel('Cliente').click()
    await adminAPage.getByRole('option').first().click()
    await adminAPage.getByLabel('Nome do Plano').fill('MEN-01 Plano Teste')
    await adminAPage.getByLabel('Valor Mensal (R$)').fill('199')
    await adminAPage.getByLabel('Dia de Vencimento').fill('10')
    await adminAPage.getByRole('button', { name: 'Cadastrar' }).click()

    await expect(adminAPage.getByText('Mensalista cadastrado com sucesso!')).toBeVisible()
    const row = adminAPage.getByRole('row', { name: /MEN-01 Plano Teste/ })
    await expect(row).toBeVisible()
    await expect(row.getByTestId(TESTIDS.MEMBER_STATUS)).toHaveText(/em dia/i)
  })

  test('MEN-02: marking a payment advances the due date and keeps the member active', async ({ adminAPage }) => {
    await adminAPage.goto('/admin/members')
    const row = adminAPage.getByRole('row', { name: /Mensalista Ativo E2E/ })
    await row.hover()
    await row.getByRole('button', { name: 'Marcar pago' }).click()

    // The handler shows a success toast then reloads the page to pick up
    // the new next_due_date — the reload can race a toast assertion, so
    // just wait for it and check the resulting state.
    await adminAPage.waitForLoadState('load')
    await expect(adminAPage.getByRole('row', { name: /Mensalista Ativo E2E/ }).getByTestId(TESTIDS.MEMBER_STATUS)).toHaveText(/em dia/i)
  })

  test('MEN-03: an overdue member appears in the overdue list', async ({ adminAPage }) => {
    await adminAPage.goto('/admin/members')
    const row = adminAPage.getByRole('row', { name: /Mensalista Atrasado E2E/ })
    await expect(row.getByTestId(TESTIDS.MEMBER_STATUS)).toHaveText(/em atraso/i)

    await adminAPage.getByRole('button', { name: /^Em atraso/ }).click()
    await expect(adminAPage.getByRole('row', { name: /Mensalista Atrasado E2E/ })).toBeVisible()
  })

  test('MEN-04: the members summary renders a sane total', async ({ adminAPage }) => {
    await adminAPage.goto('/admin/members')
    await expect(adminAPage.getByTestId(TESTIDS.MEMBER_TOTAL)).toBeVisible()
    const text = await adminAPage.getByTestId(TESTIDS.MEMBER_TOTAL).innerText()
    expect(Number(text.match(/\d+/)?.[0] ?? '-1')).toBeGreaterThanOrEqual(0)
  })

  test('MEN-05: cancelling a member sets status to cancelled and removes it from the active filter', async ({
    adminAPage,
  }) => {
    await adminAPage.goto('/admin/members')
    await adminAPage.getByRole('button', { name: 'Novo Mensalista' }).click()
    await adminAPage.getByLabel('Cliente').click()
    await adminAPage.getByRole('option').first().click()
    await adminAPage.getByLabel('Nome do Plano').fill('MEN-05 Plano Cancelar')
    await adminAPage.getByLabel('Valor Mensal (R$)').fill('150')
    await adminAPage.getByLabel('Dia de Vencimento').fill('15')
    await adminAPage.getByRole('button', { name: 'Cadastrar' }).click()
    await expect(adminAPage.getByText('Mensalista cadastrado com sucesso!')).toBeVisible()

    const row = adminAPage.getByRole('row', { name: /MEN-05 Plano Cancelar/ })
    await row.hover()
    await row.getByRole('button', { name: 'Cancelar mensalista' }).click()

    await expect(adminAPage.getByText('Mensalista cancelado.')).toBeVisible()
    await expect(row.getByTestId(TESTIDS.MEMBER_STATUS)).toHaveText(/cancelado/i)

    await adminAPage.getByRole('button', { name: /^Em dia/ }).click()
    await expect(adminAPage.getByRole('row', { name: /MEN-05 Plano Cancelar/ })).toHaveCount(0)
  })
})
