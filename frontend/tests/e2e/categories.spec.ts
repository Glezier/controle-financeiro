import {
  test,
  expect,
  signIn,
  navigate,
  registerAndSignIn,
  transactionTable,
  summary,
} from './helpers'

test('blocks linked categories and preserves transactions when a category is renamed', async ({
  page,
}) => {
  await signIn(page, '/categorias')
  await expect(page.getByRole('button', { name: 'Excluir Moradia', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Editar Moradia', exact: true }).click()
  const form = page.getByRole('form', { name: 'Editar categoria', exact: true })
  await expect(form.getByLabel('Tipo', { exact: true })).toBeDisabled()
  await expect(form.getByLabel('Nome da Categoria', { exact: true })).toBeFocused()
  await form.getByLabel('Nome da Categoria', { exact: true }).fill('Casa')
  await form.getByRole('button', { name: 'Atualizar Categoria', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Editar Casa', exact: true })).toBeVisible()
  await navigate(page, 'Transações')
  await expect(transactionTable(page).getByText('Casa', { exact: true })).toHaveCount(2)
  await navigate(page, 'Visão Geral')
  await expect(summary(page)).toContainText('3.420,50')
  await expect(page.getByText('Casa', { exact: true }).first()).toBeVisible()
})

test('creates, validates duplicates, edits and deletes unused categories', async ({ page }) => {
  await signIn(page, '/categorias')
  let form = page.getByRole('form', { name: 'Adicionar categoria', exact: true })
  await form.getByRole('button', { name: 'Salvar Categoria', exact: true }).click()
  await expect(form.getByLabel('Nome da Categoria', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await form.getByLabel('Nome da Categoria', { exact: true }).fill('Educação')
  await form.getByLabel('Descrição visual (opcional)', { exact: true }).fill('Livros e cursos')
  await form.getByLabel('Ícone de identificação', { exact: true }).selectOption('leisure')
  await form.getByRole('radio', { name: 'Verde', exact: true }).focus()
  await page.keyboard.press('Space')
  await form.getByRole('button', { name: 'Salvar Categoria', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Editar Educação', exact: true })).toBeVisible()
  form = page.getByRole('form', { name: 'Adicionar categoria', exact: true })
  await form.getByLabel('Nome da Categoria', { exact: true }).fill('Educação')
  await form.getByRole('button', { name: 'Salvar Categoria', exact: true }).click()
  await expect(form.getByRole('alert')).toContainText('Já existe uma categoria')
  await expect(form.getByLabel('Nome da Categoria', { exact: true })).toHaveValue('Educação')
  await page.getByRole('button', { name: 'Editar Educação', exact: true }).click()
  form = page.getByRole('form', { name: 'Editar categoria', exact: true })
  await form.getByLabel('Nome da Categoria', { exact: true }).fill('Bolsa')
  await form.getByLabel('Tipo', { exact: true }).selectOption('income')
  await form.getByRole('button', { name: 'Atualizar Categoria', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Excluir Bolsa', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Excluir Bolsa', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Excluir Bolsa', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Excluir Bolsa', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar Exclusão', exact: true }).click()
  await expect(page.getByText('Categoria excluída.', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar Bolsa', exact: true })).toHaveCount(0)
})

test('keeps creation available after the last unused category is removed', async ({ page }) => {
  await registerAndSignIn(page)
  await navigate(page, 'Categorias')
  for (const name of [
    'Alimentação',
    'Lazer',
    'Moradia',
    'Salário & Renda',
    'Saúde',
    'Transporte',
  ]) {
    await page.getByRole('button', { name: `Excluir ${name}`, exact: true }).click()
    await page.getByRole('button', { name: 'Confirmar Exclusão', exact: true }).click()
    await expect(page.getByRole('button', { name: `Excluir ${name}`, exact: true })).toHaveCount(0)
  }
  await expect(page.getByText('Nenhuma categoria cadastrada', { exact: true })).toBeVisible()
  const form = page.getByRole('form', { name: 'Adicionar categoria', exact: true })
  await form.getByLabel('Nome da Categoria', { exact: true }).fill('Primeira categoria')
  await form.getByRole('button', { name: 'Salvar Categoria', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Editar Primeira categoria', exact: true }),
  ).toBeVisible()
})
