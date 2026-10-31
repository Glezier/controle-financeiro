import { test, expect, signIn, summary, transactionTable, fillTransaction } from './helpers'

test('creates pending transactions, edits status and period, and confirms deletion', async ({
  page,
}) => {
  await signIn(page, '/transacoes')
  await expect(transactionTable(page)).toBeVisible()
  await page.getByRole('button', { name: 'Nova Transação', exact: true }).click()
  await fillTransaction(page, 'Material de estudo', '125,50')
  await page.getByRole('dialog').getByLabel('Situação', { exact: true }).selectOption('pending')
  await page.getByRole('button', { name: 'Salvar Transação', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Editar Material de estudo', exact: true }),
  ).toBeVisible()
  await expect(summary(page)).toContainText('3.420,50')
  await expect(summary(page)).toContainText('475,50')
  await page
    .getByRole('button', { name: 'Ver detalhes de Material de estudo', exact: true })
    .click()
  await expect(page.getByRole('dialog').getByRole('form')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Editar Material de estudo', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Valor (R$)', { exact: true })).toHaveValue('125,50')
  await dialog.getByLabel('Situação', { exact: true }).selectOption('paid')
  await dialog.getByLabel('Data', { exact: true }).fill('2024-09-30')
  await dialog.getByRole('button', { name: 'Salvar Alterações', exact: true }).click()
  await expect(page).toHaveURL('/transacoes?period=2024-09')
  await expect(summary(page)).toContainText('3.004,50')
  await page.getByRole('button', { name: 'Excluir Material de estudo', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Editar Material de estudo', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Excluir Material de estudo', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Excluir Transação', exact: true })
    .click()
  await expect(summary(page)).toContainText('3.130,00')
  await expect(transactionTable(page).getByText('Material de estudo', { exact: true })).toHaveCount(
    0,
  )
})

test('combines filters, paginates without changing totals and restores filter history', async ({
  page,
}) => {
  await signIn(page, '/transacoes?period=all')
  await expect(summary(page)).toContainText('6.550,50')
  await page.getByRole('button', { name: 'Próxima', exact: true }).click()
  await expect(page.getByText('Página 2 de 2', { exact: true })).toBeVisible()
  await expect(transactionTable(page).getByRole('row')).toHaveCount(4)
  await expect(summary(page)).toContainText('6.550,50')
  await page.getByLabel('Buscar por descrição', { exact: true }).fill('FARMACIA')
  await expect(transactionTable(page).getByRole('row')).toHaveCount(2)
  await page.getByLabel('Situação', { exact: true }).selectOption('pending')
  await expect(page.getByText('Nenhuma transação encontrada', { exact: true })).toBeVisible()
  await page.getByLabel('Buscar por descrição', { exact: true }).fill(' internet ')
  await page.getByLabel('Tipo', { exact: true }).selectOption('expense')
  await page.getByLabel('Categoria', { exact: true }).selectOption({ label: 'Moradia' })
  await expect(transactionTable(page).getByRole('row')).toHaveCount(2)
  await expect(transactionTable(page)).toContainText('Internet Fibra')
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click()
  await expect(page.getByText('Página 1 de 2', { exact: true })).toBeVisible()
  await page.getByLabel('Tipo', { exact: true }).selectOption('expense')
  await expect(transactionTable(page).getByRole('row')).toHaveCount(9)
  await page.getByLabel('Tipo', { exact: true }).selectOption('income')
  await expect(transactionTable(page).getByRole('row')).toHaveCount(4)
  await page.goBack()
  await expect(page.getByLabel('Tipo', { exact: true })).toHaveValue('expense')
  await expect(transactionTable(page).getByRole('row')).toHaveCount(9)
})

test('validates fields, clears incompatible categories and prevents duplicate submissions', async ({
  page,
}) => {
  await signIn(page, '/transacoes')
  await expect(transactionTable(page)).toBeVisible()
  await page.getByRole('button', { name: 'Nova Transação', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Salvar Transação', exact: true }).click()
  await expect(dialog.locator('[aria-invalid="true"]')).toHaveCount(3)
  await expect(dialog.getByLabel('Descrição', { exact: true })).toBeFocused()
  await fillTransaction(page, 'Envio único', '0,10')
  await dialog.getByRole('radio', { name: 'Receita', exact: true }).focus()
  await page.keyboard.press('Space')
  await expect(dialog.getByLabel('Categoria', { exact: true })).toHaveValue('')
  await dialog.getByRole('radio', { name: 'Despesa', exact: true }).focus()
  await page.keyboard.press('Space')
  await dialog.getByLabel('Categoria', { exact: true }).selectOption({ label: 'Moradia' })
  // Two submit events in one turn exercise the guard before React disables the button.
  await dialog.getByRole('form').evaluate((form) => {
    if (!(form instanceof HTMLFormElement)) throw new Error('Expected a native form')
    form.requestSubmit()
    form.requestSubmit()
  })
  await expect(
    transactionTable(page).getByRole('row').filter({ hasText: 'Envio único' }),
  ).toHaveCount(1)
  await expect(summary(page)).toContainText('3.420,40')
})

test('cancels a pending write when its modal closes', async ({ page }) => {
  await page.clock.install({ time: new Date('2024-10-24T10:00:00Z') })
  await signIn(page, '/transacoes')
  await expect(transactionTable(page)).toBeVisible()
  await page.getByRole('button', { name: 'Nova Transação', exact: true }).click()
  await fillTransaction(page, 'Operação cancelada', '100,00')
  await page.clock.pauseAt(new Date('2024-10-24T11:00:00Z'))
  await page.getByRole('button', { name: 'Salvar Transação', exact: true }).click()
  await expect(page.getByRole('form', { name: 'Nova transação', exact: true })).toHaveAttribute(
    'aria-busy',
    'true',
  )
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page.clock.runFor(1000)
  await expect(transactionTable(page).getByText('Operação cancelada', { exact: true })).toHaveCount(
    0,
  )
  await expect(summary(page)).toContainText('3.420,50')
})
