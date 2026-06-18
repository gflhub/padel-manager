import { TESTIDS } from '@/lib/testids'
import { test, expect } from '../fixtures'
import { comandaForClub, comandaStatus, paymentsForComanda } from '../test-data'

test.describe('comanda counter close', () => {
  test('COM-02: closing with PIX updates the comanda status and daily revenue @p0', async ({ adminAPage }) => {
    const comanda = await comandaForClub(adminAPage.request, 'Clube A', {
      customerNameContains: 'Fechamento',
      customerNameExcludes: 'Dupla',
    })

    await adminAPage.goto('/admin/comandas')
    await adminAPage.getByRole('button', { name: 'Tabela' }).click() // the table view is the one with data-testid hooks
    await adminAPage
      .getByRole('row', { name: comanda.customerName ?? '' })
      .getByTestId('view-comanda')
      .click()

    await expect(adminAPage.getByTestId(TESTIDS.COMANDA_STATUS)).toHaveText(/aberta/i)

    await adminAPage.getByRole('button', { name: 'Fechar Comanda' }).click()
    await adminAPage.getByTestId(TESTIDS.PAYMENT_METHOD).click()
    await adminAPage.getByRole('option', { name: 'PIX' }).click()
    await adminAPage.getByTestId(TESTIDS.CLOSE_COMANDA).click()

    await expect(adminAPage.getByText(/comanda fechada/i)).toBeVisible()

    const after = await comandaStatus(adminAPage.request, comanda.id)
    expect(after.status).toBe('CLOSED')

    const payments = await paymentsForComanda(adminAPage.request, comanda.id)
    expect(payments.count).toBe(1)
    expect(payments.methods).toContain('PIX')
    expect(payments.amounts[0]).toBe(comanda.total)
  })

  test('COM-04: closing an already-closed comanda does not duplicate revenue @p0', async ({ adminAPage }) => {
    const comanda = await comandaForClub(adminAPage.request, 'Clube A', { customerNameContains: 'Fechamento Dupla' })

    const firstClose = await adminAPage.request.post(`/api/e2e-only/comandas/${comanda.id}/close`, {
      data: { paymentMethod: 'pix' },
    })
    expect(firstClose.ok()).toBeTruthy()

    const secondClose = await adminAPage.request.post(`/api/e2e-only/comandas/${comanda.id}/close`, {
      data: { paymentMethod: 'pix' },
    })
    expect(secondClose.status()).toBeLessThan(500)
    expect(secondClose.ok()).toBeFalsy()

    const payments = await paymentsForComanda(adminAPage.request, comanda.id)
    expect(payments.count).toBe(1)
  })
})
