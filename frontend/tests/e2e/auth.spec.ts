import { test, expect, signIn, registerAndSignIn, navigate } from './helpers'

test('protects a requested route and recovers from invalid credentials and simulated failure', async ({
  page,
}) => {
  await page.goto('/transacoes?period=2024-09')
  await expect(page).toHaveURL('/login')
  await page.getByLabel('E-mail', { exact: true }).fill('')
  await page.getByLabel('Senha', { exact: true }).fill('')
  await page.getByRole('button', { name: 'Acessar Sistema' }).click()
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(2)
  await expect(page.getByLabel('E-mail', { exact: true })).toBeFocused()
  await page.getByLabel('E-mail', { exact: true }).fill('lucas.mendes@email.com')
  await page.getByLabel('Senha', { exact: true }).fill('87654321')
  await page.getByRole('button', { name: 'Mostrar senha', exact: true }).click()
  await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Ocultar senha', exact: true }).click()
  await page.getByRole('button', { name: 'Acessar Sistema' }).click()
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos')
  await page.getByLabel('Senha', { exact: true }).fill('12345678')
  await page.getByRole('button', { name: 'Simular erro de acesso', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'Acessar Sistema' }).click()
  await expect(page).toHaveURL('/transacoes?period=2024-09')
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(4)
  await navigate(page, 'Visão Geral')
  await expect(page).toHaveURL('/visao-geral')
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page).toHaveURL('/login')
  await page.goBack()
  await expect(page).toHaveURL('/login')
})

test('validates registration and creates an isolated demonstration account', async ({ page }) => {
  await page.goto('/cadastro')
  await page.getByRole('button', { name: 'Criar Minha Conta' }).click()
  await expect(page.getByLabel('Nome completo', { exact: true })).toBeFocused()
  await expect(page.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true')
  await registerAndSignIn(page)
  await expect(page.getByText('Nenhuma transação neste período', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Resumo financeiro' })).toContainText('0,00')
})

test('resets the mock session when the browser reloads', async ({ page }) => {
  await signIn(page)
  await expect(page.getByText('Transações Recentes', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page).toHaveURL('/login')
})
