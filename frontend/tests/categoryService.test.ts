import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockFinance } from '../src/mocks/finance'
import { createCategoryService } from '../src/services/categoryService'
import { createFinanceService } from '../src/services/financeService'
import type { CategoryDraft, FinanceResult } from '../src/types/finance'

const owner = 'lucas.mendes@email.com'
const draft: CategoryDraft = {
  name: 'Educação',
  type: 'expense',
  description: 'Livros e cursos',
  color: 'var(--color-primary)',
  icon: 'leisure',
}
async function settle<T>(pending: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync()
  return pending
}
function data<T>(result: FinanceResult<T>): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}
function setup() {
  const adapter = createMockFinance()
  return {
    adapter,
    categories: createCategoryService(adapter),
    finance: createFinanceService(adapter),
  }
}

describe('category management and referential integrity', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  it('counts links across all periods and statuses from the shared ledger', async () => {
    const { categories } = setup()
    const snapshot = data(await settle(categories.getCategories(owner)))
    expect(snapshot).toMatchObject({ total: 6, incomeCount: 1, expenseCount: 5 })
    expect(snapshot.items.reduce((sum, item) => sum + item.transactionCount, 0)).toBe(11)
    expect(snapshot.items.find((item) => item.name === 'Moradia')?.transactionCount).toBe(3)
    expect(snapshot.items.map((item) => item.name)).toEqual(
      [...snapshot.items.map((item) => item.name)].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    )
  })
  it('creates trimmed categories with provisional metadata available to transactions', async () => {
    const { categories, finance } = setup()
    const created = data(
      await settle(
        categories.createCategory(owner, {
          ...draft,
          name: '  Educação  ',
          description: '  Livros e cursos  ',
        }),
      ),
    )
    expect(created).toMatchObject({
      name: 'Educação',
      type: 'expense',
      appearance: { description: 'Livros e cursos', color: draft.color, icon: 'leisure' },
    })
    expect(data(await settle(finance.getDashboard(owner, '2024-10'))).categories).toContainEqual(
      created,
    )
    expect(
      data(await settle(categories.getCategories(owner))).items.find(
        (item) => item.id === created.id,
      )?.transactionCount,
    ).toBe(0)
  })
  it('rejects a duplicate name for the same owner/type but allows another type or owner', async () => {
    const { categories } = setup()
    data(await settle(categories.createCategory(owner, draft)))
    expect(
      await settle(categories.createCategory(owner, { ...draft, name: ' Educação ' })),
    ).toMatchObject({
      ok: false,
      error: { code: 'duplicate', fields: { name: expect.any(String) } },
    })
    expect(
      await settle(categories.createCategory(owner, { ...draft, type: 'income' })),
    ).toMatchObject({ ok: true })
    expect(await settle(categories.createCategory('ana@example.com', draft))).toMatchObject({
      ok: true,
    })
  })
  it('validates names, descriptions and palette values before writing', async () => {
    const { categories } = setup()
    for (const changes of [
      { name: '  ' },
      { name: 'a'.repeat(81) },
      { description: 'a'.repeat(161) },
      { color: 'url(private)' },
    ])
      expect(
        await settle(categories.createCategory(owner, { ...draft, ...changes })),
      ).toMatchObject({ ok: false, error: { code: 'validation' } })
    expect(data(await settle(categories.getCategories(owner))).total).toBe(6)
  })
  it('renames a linked category without losing history or changing financial totals', async () => {
    const { categories, finance } = setup()
    const initial = data(await settle(finance.getDashboard(owner, '2024-10')))
    const housing = initial.categories.find((item) => item.name === 'Moradia')!
    const renamed = data(
      await settle(categories.updateCategory(owner, housing.id, { ...draft, name: 'Casa' })),
    )
    expect(renamed.id).toBe(housing.id)
    const next = data(await settle(finance.getDashboard(owner, '2024-10')))
    expect(next.summary).toEqual(initial.summary)
    expect(
      next.recentTransactions.find((item) => item.categoryId === housing.id)?.category.name,
    ).toBe('Casa')
    expect(
      next.expensesByCategory.find((item) => item.category.id === housing.id)?.category.name,
    ).toBe('Casa')
  })
  it('blocks deleting any linked category and changing its type', async () => {
    const { categories } = setup()
    const initial = data(await settle(categories.getCategories(owner)))
    for (const category of initial.items) {
      expect(await settle(categories.deleteCategory(owner, category.id))).toMatchObject({
        ok: false,
        error: { code: 'in_use' },
      })
      expect(
        await settle(
          categories.updateCategory(owner, category.id, {
            ...draft,
            type: category.type === 'expense' ? 'income' : 'expense',
          }),
        ),
      ).toMatchObject({ ok: false, error: { code: 'in_use' } })
    }
    expect(data(await settle(categories.getCategories(owner)))).toEqual(initial)
  })
  it('rechecks live links even when the category snapshot was unused and the link is pending in another year', async () => {
    const { categories, finance } = setup()
    const created = data(await settle(categories.createCategory(owner, draft)))
    const before = data(await settle(categories.getCategories(owner)))
    expect(before.items.find((item) => item.id === created.id)?.transactionCount).toBe(0)
    const transaction = data(
      await settle(
        finance.createTransaction(owner, {
          categoryId: created.id,
          type: 'expense',
          description: 'Futura',
          amount: '10,00',
          date: '2030-01-01',
          status: 'pending',
        }),
      ),
    )
    expect(await settle(categories.deleteCategory(owner, created.id))).toMatchObject({
      ok: false,
      error: { code: 'in_use' },
    })
    expect(
      await settle(categories.updateCategory(owner, created.id, { ...draft, type: 'income' })),
    ).toMatchObject({ ok: false, error: { code: 'in_use' } })
    data(await settle(finance.deleteTransaction(owner, transaction.id)))
    expect(await settle(categories.deleteCategory(owner, created.id))).toEqual({
      ok: true,
      data: null,
    })
  })
  it('allows changing the type of an unused category and prevents duplicate updates', async () => {
    const { categories } = setup()
    const created = data(await settle(categories.createCategory(owner, draft)))
    expect(
      data(
        await settle(categories.updateCategory(owner, created.id, { ...draft, type: 'income' })),
      ),
    ).toMatchObject({ id: created.id, type: 'income' })
    const second = data(
      await settle(categories.createCategory(owner, { ...draft, name: 'Outra', type: 'income' })),
    )
    expect(
      await settle(categories.updateCategory(owner, second.id, { ...draft, type: 'income' })),
    ).toMatchObject({ ok: false, error: { code: 'duplicate' } })
  })
  it('deletes unused categories and rejects subsequent transactions referencing them', async () => {
    const { categories, finance } = setup()
    const created = data(await settle(categories.createCategory(owner, draft)))
    expect(await settle(categories.deleteCategory(owner, created.id))).toEqual({
      ok: true,
      data: null,
    })
    expect(await settle(categories.deleteCategory(owner, created.id))).toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    })
    expect(
      await settle(
        finance.createTransaction(owner, {
          type: 'expense',
          categoryId: created.id,
          amount: '10,00',
          date: '2024-10-01',
          description: 'Invalid reference',
          status: 'paid',
        }),
      ),
    ).toMatchObject({ ok: false, error: { code: 'validation' } })
  })
  it('isolates updates and deletions by owner', async () => {
    const { categories } = setup()
    const created = data(await settle(categories.createCategory(owner, draft)))
    expect(
      await settle(
        categories.updateCategory('ana@example.com', created.id, { ...draft, name: 'Other owner' }),
      ),
    ).toMatchObject({ ok: false, error: { code: 'not_found' } })
    expect(await settle(categories.deleteCategory('ana@example.com', created.id))).toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    })
    expect(
      data(await settle(categories.getCategories(owner))).items.find(
        (item) => item.id === created.id,
      )?.name,
    ).toBe(draft.name)
  })
  it('cancels create, update and delete before mutation', async () => {
    const { categories } = setup()
    const created = data(await settle(categories.createCategory(owner, draft)))
    const initial = data(await settle(categories.getCategories(owner)))
    const controller = new AbortController()
    const options = { signal: controller.signal }
    const operations: Promise<FinanceResult<unknown>>[] = [
      categories.createCategory(owner, { ...draft, name: 'Cancelled' }, options),
      categories.updateCategory(owner, created.id, { ...draft, name: 'Cancelled' }, options),
      categories.deleteCategory(owner, created.id, options),
    ]
    controller.abort()
    for (const pending of operations)
      expect(await settle(pending)).toMatchObject({ ok: false, error: { code: 'cancelled' } })
    expect(data(await settle(categories.getCategories(owner)))).toEqual(initial)
  })
  it('returns recoverable errors without exposing adapter details or mutating on simulated failure', async () => {
    const { categories, adapter } = setup()
    const initial = data(await settle(categories.getCategories(owner)))
    expect(
      await settle(categories.createCategory(owner, draft, { simulateFailure: true })),
    ).toMatchObject({ ok: false, error: { code: 'unavailable' } })
    vi.spyOn(adapter, 'createCategory').mockRejectedValue(new Error('private adapter details'))
    const result = await settle(categories.createCategory(owner, draft))
    expect(result).toMatchObject({ ok: false, error: { code: 'unavailable' } })
    expect(JSON.stringify(result)).not.toContain('private adapter details')
    expect(data(await settle(categories.getCategories(owner)))).toEqual(initial)
    vi.spyOn(adapter, 'listCategories').mockRejectedValue(new Error('read failed'))
    expect(await settle(categories.getCategories(owner))).toMatchObject({
      ok: false,
      error: { code: 'unavailable' },
    })
  })
  it('returns detached records and an empty state after deleting unused categories', async () => {
    const { categories } = setup()
    const snapshot = data(await settle(categories.getCategories('ana@example.com')))
    snapshot.items[0].appearance!.color = 'external mutation'
    expect(
      data(await settle(categories.getCategories('ana@example.com'))).items[0].appearance?.color,
    ).not.toBe('external mutation')
    for (const category of snapshot.items)
      data(await settle(categories.deleteCategory('ana@example.com', category.id)))
    expect(data(await settle(categories.getCategories('ana@example.com')))).toEqual({
      items: [],
      total: 0,
      incomeCount: 0,
      expenseCount: 0,
    })
  })
})
