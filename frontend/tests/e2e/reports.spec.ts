import { test, expect, signIn, navigate, summary, fillTransaction } from './helpers'

test('consolidates monthly, rolling and annual periods with exact accessible values', async ({
  page,
}) => {
  await signIn(page, '/relatorios')
  await expect(summary(page)).toContainText('3.420,50')
  await page.getByText('Ver valores mensais', { exact: true }).click()
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(5)
  await page.getByRole('button', { name: 'Últimos 3 meses', exact: true }).click()
  await expect(summary(page)).toContainText('6.550,50')
  await page.getByText('Ver valores mensais', { exact: true }).click()
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(4)
  await page.getByRole('button', { name: 'Ano selecionado', exact: true }).click()
  await expect(summary(page)).toContainText('6.550,50')
  await page.getByText('Ver valores mensais', { exact: true }).click()
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(13)
  await page.getByLabel('Mês de referência', { exact: true }).fill('2025-01')
  await page.getByRole('button', { name: 'Aplicar período', exact: true }).click()
  await expect(
    page.getByText('Sem lançamentos no período selecionado', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Sem despesas efetivadas', { exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByLabel('Mês de referência', { exact: true })).toHaveValue('2024-10')
  await expect(summary(page)).toContainText('6.550,50')
  await page.getByLabel('Mês de referência', { exact: true }).fill('')
  await page.getByRole('button', { name: 'Aplicar período', exact: true }).click()
  await expect(page.getByText('Informe um mês e ano válidos.', { exact: true })).toBeVisible()
  await expect(summary(page)).toContainText('6.550,50')
})

test('keeps pending movements out of reports and reflects a paid transaction', async ({ page }) => {
  await signIn(page, '/transacoes')
  await expect(page.getByRole('table')).toBeVisible()
  await page.getByRole('button', { name: 'Nova Transação', exact: true }).click()
  await fillTransaction(page, 'Pendente futura', '100,00', '2025-01-20')
  await page.getByRole('dialog').getByLabel('Situação', { exact: true }).selectOption('pending')
  await page.getByRole('button', { name: 'Salvar Transação', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Editar Pendente futura', exact: true }),
  ).toBeVisible()
  await navigate(page, 'Relatórios')
  await expect(summary(page)).toContainText('3.420,50')
  await page.getByLabel('Mês de referência', { exact: true }).fill('2025-01')
  await page.getByRole('button', { name: 'Aplicar período', exact: true }).click()
  await expect(page.getByText('Sem despesas efetivadas', { exact: true })).toBeVisible()
  await expect(page.getByText(/Taxa de resultado indisponível/)).toBeVisible()
  await expect(
    page
      .getByRole('heading', { name: 'Pendências fora dos indicadores', exact: true })
      .locator('..'),
  ).toContainText('100,00')
  await navigate(page, 'Transações')
  await expect(page.getByRole('table')).toBeVisible()
  await page.getByRole('button', { name: 'Nova Transação', exact: true }).click()
  await fillTransaction(page, 'Efetivada outubro', '100,00')
  await page.getByRole('button', { name: 'Salvar Transação', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Editar Efetivada outubro', exact: true }),
  ).toBeVisible()
  await navigate(page, 'Relatórios')
  await expect(summary(page)).toContainText('3.320,50')
})

for (const route of ['visao-geral', 'transacoes', 'categorias', 'relatorios']) {
  test(`recovers from a simulated read error on /${route}`, async ({ page }) => {
    await signIn(page, `/${route}?cenario=erro`)
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(summary(page)).toHaveCount(0)
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
    await expect(page).not.toHaveURL(/cenario=erro/)
    await expect(page.getByRole('alert')).toHaveCount(0)
    if (route === 'categorias') await expect(page.getByRole('table')).toBeVisible()
    else await expect(summary(page)).toBeVisible()
  })
}
