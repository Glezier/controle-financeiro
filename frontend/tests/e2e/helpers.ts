import { expect, test, type Page, type TestInfo } from '@playwright/test'

export { expect, test }

const pageErrors = new WeakMap<Page, string[]>()
test.beforeEach(({ page }) => {
  const errors: string[] = []
  pageErrors.set(page, errors)
  page.on('pageerror', (error) => errors.push(error.message))
})
test.afterEach(({ page }) => expect(pageErrors.get(page)).toEqual([]))

export async function signIn(page: Page, destination = '/visao-geral') {
  await page.goto(destination)
  await expect(page).toHaveURL(/\/login$/)
  await page.getByRole('button', { name: 'Acessar Sistema', exact: true }).click()
  await expect(page).toHaveURL(destination)
}

export async function navigate(page: Page, name: string) {
  const toggle = page.getByRole('button', { name: 'Abrir menu de navegação', exact: true })
  if (await toggle.isVisible()) {
    await toggle.click()
    await page
      .getByRole('dialog', { name: 'Navegação', exact: true })
      .getByRole('link', { name, exact: true })
      .click()
  } else await page.getByRole('link', { name, exact: true }).click()
}

export async function registerAndSignIn(page: Page, email = 'ana@example.com') {
  await page.goto('/cadastro')
  await page.getByLabel('Nome completo', { exact: true }).fill('Ana Teste')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill('12345678')
  await page.getByLabel('Confirmar senha', { exact: true }).fill('12345678')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Criar Minha Conta', exact: true }).click()
  await expect(page).toHaveURL('/login')
  await page.getByLabel('Senha', { exact: true }).fill('12345678')
  await page.getByRole('button', { name: 'Acessar Sistema', exact: true }).click()
  await expect(page).toHaveURL('/visao-geral')
}

export const transactionTable = (page: Page) =>
  page.getByRole('table', { name: 'Transações financeiras filtradas', exact: true })
export const summary = (page: Page) =>
  page.getByRole('region', { name: 'Resumo financeiro', exact: true })

export async function fillTransaction(
  page: Page,
  description: string,
  amount: string,
  date = '2024-10-31',
) {
  const form = page.getByRole('dialog').getByRole('form')
  await form.getByLabel('Descrição', { exact: true }).fill(description)
  await form.getByLabel('Valor (R$)', { exact: true }).fill(amount)
  await form.getByLabel('Data', { exact: true }).fill(date)
  await form.getByLabel('Categoria', { exact: true }).selectOption({ label: 'Moradia' })
}

export async function capture(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`)
  await page.screenshot({ path, fullPage: true })
  await testInfo.attach(name, { path, contentType: 'image/png' })
}
