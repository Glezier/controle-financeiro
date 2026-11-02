import { expect, it, vi } from 'vitest'
import type { TransactionQuery } from '../src/types/finance'

const url = process.env.TRANSACTION_API_INTEGRATION_URL

it.skipIf(!url)('persists transactions, filters, paginates and isolates financial data over HTTP', async () => {
  const target = new URL(url!)
  if (!['localhost', '127.0.0.1'].includes(target.hostname)) throw new Error('Use apenas a API local temporária.')
  expect((await fetch(`${target.origin}/health`)).headers.get('X-Local-Demo')).toBe('true')
  const storage = new Map<string, string>()
  vi.stubEnv('VITE_API_URL', url!)
  vi.stubGlobal('window', new EventTarget())
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  })
  vi.resetModules()
  try {
    const { api, saveSession } = await import('../src/services/api')
    const { createApiCategoryService } = await import('../src/services/apiCategoryService')
    const { createApiTransactionService } = await import('../src/services/apiTransactionService')
    const categories = createApiCategoryService()
    const transactions = createApiTransactionService()
    async function login(email: string) {
      const response = await api<{ data: { session: { access_token: string; refresh_token: string } } }>(
        '/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'Demo12345!' }) }, false,
      )
      saveSession(response.data.session)
    }
    await login('demo@local.test')
    const category = await categories.createCategory('ignored', { name: `Transações ${crypto.randomUUID()}`, type: 'expense', icon: 'school' })
    if (!category.ok) throw new Error(category.error.message)
    const categoryId = category.data.id
    const ids: string[] = []
    const query: TransactionQuery = { period: '2027-03', type: 'expense', status: 'all', categoryId, search: '', page: 1 }
    try {
      for (let i = 0; i < 9; i++) {
        const created = await transactions.createTransaction('ignored', {
          categoryId, type: 'expense', amount: '10,29', date: '2027-03-15', description: `Integração ${i}`,
          status: i === 0 ? 'pending' : 'paid',
        })
        if (!created.ok) throw new Error(created.error.message)
        ids.push(created.data.id)
        expect(created.data).toMatchObject({ amountCents: 1029, date: '2027-03-15' })
      }
      const listed = await transactions.getTransactions('ignored', query)
      expect(listed).toMatchObject({ ok: true, data: { total: 9, totalPages: 2, page: 1,
        summary: { expenseCents: 8232, pendingExpenseCents: 1029, balanceCents: -8232, paidExpenseCount: 8, pendingCount: 1 } } })
      if (!listed.ok) throw new Error(listed.error.message)
      expect(listed.data.items).toHaveLength(8)
      expect(listed.data.availablePeriods).toContain('2027-03')
      const lastPage = await transactions.getTransactions('ignored', { ...query, page: 999 })
      expect(lastPage).toMatchObject({ ok: true, data: { page: 2 } })
      expect(lastPage.ok && lastPage.data.items.length).toBe(1)

      expect(await transactions.getTransactions('ignored', { ...query, status: 'pending' }))
        .toMatchObject({ ok: true, data: { total: 1, summary: { expenseCents: 0, pendingExpenseCents: 1029, balanceCents: 0 } } })
      expect(await transactions.updateTransaction('ignored', ids[0], {
        categoryId, type: 'income', amount: '10,29', date: '2027-03-15', description: 'Incompatível', status: 'paid',
      })).toMatchObject({ ok: false, error: { code: 'validation', fields: { categoryId: expect.any(String) } } })
      expect(await transactions.updateTransaction('ignored', ids[0], {
        categoryId, type: 'expense', amount: '12,34', date: '2027-04-01', description: 'Editada persistente', status: 'paid',
      })).toMatchObject({ ok: true, data: { amountCents: 1234, date: '2027-04-01', status: 'paid' } })
      expect(await createApiTransactionService().getTransactions('ignored', { ...query, period: '2027-04', search: 'persistente' }))
        .toMatchObject({ ok: true, data: { total: 1, items: [{ id: ids[0], amountCents: 1234 }] } })

      await login('outro@local.test')
      expect(await transactions.getTransactions('ignored', { ...query, period: 'all', categoryId: 'all' }))
        .toMatchObject({ ok: true, data: { total: 0, totalRecords: 0, summary: { balanceCents: 0 } } })
      expect(await transactions.deleteTransaction('ignored', ids[0])).toMatchObject({ ok: false, error: { code: 'not_found' } })
      expect(await transactions.updateTransaction('ignored', ids[0], {
        categoryId, type: 'expense', amount: '10,00', date: '2027-03-15', description: 'Outro usuário', status: 'paid',
      })).toMatchObject({ ok: false, error: { code: 'not_found' } })
    } finally {
      await login('demo@local.test')
      for (const id of ids) expect(await transactions.deleteTransaction('ignored', id)).toEqual({ ok: true, data: null })
      expect(await categories.deleteCategory('ignored', categoryId)).toEqual({ ok: true, data: null })
    }
  } finally {
    vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules()
  }
}, 60_000)
