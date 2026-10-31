import { test, expect, signIn, navigate, summary, capture } from './helpers'
import type { Page } from '@playwright/test'

async function assertPageStructure(page: Page) {
  const result = await page.evaluate(() => {
    const visible = (element: Element) =>
      element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== 'hidden' &&
      !element.closest('dialog:not([open])')
    const ids = Array.from(document.querySelectorAll('[id]'), (element) => element.id)
    const references = Array.from(
      document.querySelectorAll('[aria-labelledby], [aria-describedby], [aria-controls]'),
    ).flatMap((element) =>
      ['aria-labelledby', 'aria-describedby', 'aria-controls'].flatMap((attribute) =>
        (element.getAttribute(attribute) ?? '')
          .split(/\s+/)
          .filter(Boolean)
          .filter((id) => !document.getElementById(id)),
      ),
    )
    const controls = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'input, select, textarea',
      ),
    ).filter(visible)
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      clippedMetrics: Array.from(document.querySelectorAll('.summary-value')).some(
        (element) => element.scrollWidth > element.clientWidth,
      ),
      headings: Array.from(document.querySelectorAll('h1')).filter(visible).length,
      duplicateIds: ids.length !== new Set(ids).size,
      missingReferences: references,
      unlabelledControls: controls
        .filter(
          (element) =>
            !element.labels?.length &&
            !element.getAttribute('aria-label') &&
            !element.getAttribute('aria-labelledby'),
        )
        .map((element) => element.name),
      missingAlt: Array.from(document.images).filter((element) => !element.hasAttribute('alt'))
        .length,
    }
  })
  expect(result).toEqual({
    overflow: false,
    clippedMetrics: false,
    headings: 1,
    duplicateIds: false,
    missingReferences: [],
    unlabelledControls: [],
    missingAlt: 0,
  })
}

for (const route of ['visao-geral', 'transacoes', 'categorias', 'relatorios']) {
  test(`keeps /${route} responsive and produces visual review captures`, async ({
    page,
  }, testInfo) => {
    await signIn(page, `/${route}`)
    if (route === 'categorias') await expect(page.getByRole('table')).toBeVisible()
    else await expect(summary(page)).toBeVisible()
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 950 })
      await assertPageStructure(page)
      await capture(page, testInfo, `${route}-${width}`)
    }
  })
}

for (const route of ['login', 'cadastro']) {
  test(`keeps /${route} labelled and responsive`, async ({ page }, testInfo) => {
    await page.goto(`/${route}`)
    await expect(page.getByRole('form')).toBeVisible()
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 950 })
      await assertPageStructure(page)
      await capture(page, testInfo, `${route}-${width}`)
    }
  })
}

test('keeps modal keyboard focus contained and restores mobile navigation', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 600 })
  await signIn(page)
  await expect(summary(page)).toBeVisible()
  await navigate(page, 'Transações')
  await expect(page.getByRole('table')).toBeVisible()
  const trigger = page.getByRole('button', { name: 'Nova Transação', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Registrar Nova Transação', exact: true })
  const close = dialog.getByRole('button', { name: 'Fechar registrar nova transação', exact: true })
  await close.focus()
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: 'Salvar Transação', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  await capture(page, testInfo, 'transaction-modal-mobile')
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await page.getByRole('button', { name: 'Abrir menu de navegação', exact: true }).click()
  const menu = page.getByRole('dialog', { name: 'Navegação', exact: true })
  await menu.getByRole('link', { name: 'Categorias', exact: true }).click()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('#main-content')).toBeFocused()
  await page.locator('.app-skip-link').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
})

test('offers recovery for an unknown route inside the authenticated application', async ({
  page,
}) => {
  await signIn(page)
  await page.evaluate(() => {
    history.pushState({}, '', '/inexistente')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(
    page.getByRole('heading', { name: 'Página não encontrada', exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Página em preparação', { exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'Ir para Visão Geral', exact: true }).click()
  await expect(summary(page)).toContainText('3.420,50')
})
