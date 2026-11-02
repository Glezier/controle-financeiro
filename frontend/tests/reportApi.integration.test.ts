import { expect, it, vi } from 'vitest'

const url = process.env.REPORT_API_INTEGRATION_URL

it.skipIf(!url)('keeps dashboard and month/quarter/year reports consistent after real mutations and across users', async () => {
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
    const { createApiReportService } = await import('../src/services/apiReportService')
    const { createApiTransactionService } = await import('../src/services/apiTransactionService')
    const { createApiCategoryService } = await import('../src/services/apiCategoryService')
    const reports = createApiReportService()
    const transactions = createApiTransactionService()
    const categories = createApiCategoryService()
    async function login(email: string) {
      const response = await api<{ data: { session: { access_token: string; refresh_token: string } } }>(
        '/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'Demo12345!' }) }, false,
      )
      saveSession(response.data.session)
    }
    await login('demo@local.test')
    const baseline = await reports.getDashboard('ignored', '2024-10')
    expect(baseline).toMatchObject({ ok: true, data: { transactionCount: 8, summary: {
      incomeCents: 580000, expenseCents: 237950, balanceCents: 342050, pendingExpenseCents: 35000,
    } } })
    expect(baseline.ok && baseline.data.recentTransactions.length).toBe(6)
    const monthly = await reports.getReport('ignored', { period: '2024-10', range: 'month' })
    expect(monthly).toMatchObject({ ok: true, data: { transactionCount: 8, startPeriod: '2024-10', endPeriod: '2024-10', summary: { balanceCents: 342050 } } })
    if (!monthly.ok) throw new Error(monthly.error.message)
    expect(monthly.data.months).toHaveLength(4)
    expect(monthly.data.months.map((month) => month.transactionCount)).toEqual([0, 0, 0, 8])
    expect(monthly.data.expensesByCategory.reduce((sum, item) => sum + item.amountCents, 0)).toBe(237950)

    const category = await categories.createCategory('ignored', { name: `Relatório ${crypto.randomUUID()}`, type: 'expense', icon: 'school' })
    if (!category.ok) throw new Error(category.error.message)
    const categoryId = category.data.id
    const draft = { categoryId, type: 'expense', amount: '12,34', date: '2024-10-31', description: 'Atualiza indicadores', status: 'pending' } as const
    let id: string | undefined
    try {
      const created = await transactions.createTransaction('ignored', draft)
      if (!created.ok) throw new Error(created.error.message)
      id = created.data.id
      expect(await reports.getDashboard('ignored', '2024-10'))
        .toMatchObject({ ok: true, data: { transactionCount: 9, summary: { balanceCents: 342050, pendingExpenseCents: 36234 } } })
      expect(await transactions.updateTransaction('ignored', id, { ...draft, status: 'paid' })).toMatchObject({ ok: true })
      expect(await categories.updateCategory('ignored', categoryId, { name: 'Categoria renomeada no relatório', type: 'expense', icon: 'work' })).toMatchObject({ ok: true })
      const paid = await reports.getReport('ignored', { period: '2024-10', range: 'month' })
      expect(paid).toMatchObject({ ok: true, data: { transactionCount: 9, summary: { balanceCents: 340816, expenseCents: 239184, pendingExpenseCents: 35000 } } })
      expect(paid.ok && paid.data.expensesByCategory.find((item) => item.category.id === categoryId))
        .toMatchObject({ amountCents: 1234, category: { name: 'Categoria renomeada no relatório', apiIcon: 'work' } })
      const quarter = await reports.getReport('ignored', { period: '2024-10', range: 'quarter' })
      expect(quarter).toMatchObject({ ok: true, data: { startPeriod: '2024-08', endPeriod: '2024-10', transactionCount: 9 } })
      expect(quarter.ok && quarter.data.months.length).toBe(3)
      const annual = await reports.getReport('ignored', { period: '2024-10', range: 'year' })
      expect(annual.ok && annual.data.months.length).toBe(12)
      expect(annual.ok && annual.data.months.reduce((sum, month) => sum + month.balanceCents, 0)).toBe(340816)
      expect(annual.ok && annual.data.months.reduce((sum, month) => sum + month.transactionCount, 0)).toBe(9)
      const crossing = await reports.getReport('ignored', { period: '2025-01', range: 'quarter' })
      expect(crossing.ok && crossing.data.months.map((month) => month.period)).toEqual(['2024-11', '2024-12', '2025-01'])

      await login('outro@local.test')
      expect(await reports.getDashboard('ignored', '2024-10')).toMatchObject({ ok: true, data: { transactionCount: 0, recentTransactions: [], expensesByCategory: [], summary: { balanceCents: 0 } } })
      expect(await reports.getReport('ignored', { period: '2024-10', range: 'year' })).toMatchObject({ ok: true, data: { transactionCount: 0, resultRate: null, expensesByCategory: [], summary: { balanceCents: 0 } } })
    } finally {
      await login('demo@local.test')
      if (id) expect(await transactions.deleteTransaction('ignored', id)).toMatchObject({ ok: true })
      expect(await categories.deleteCategory('ignored', categoryId)).toMatchObject({ ok: true })
    }
    expect(await reports.getDashboard('ignored', '2024-10')).toMatchObject(baseline)
  } finally {
    vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules()
  }
}, 60_000)
