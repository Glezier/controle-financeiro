import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiReportService } from '../src/services/apiReportService'

const categoryId = 'e63f7ed1-f51c-42c6-b379-e1065ed6b041'
const id = '9a5a9abc-982b-4d7d-8e36-99e37d4b369f'
const report = {
  paid_income: '5800.00', paid_expense: '2379.50', available_balance: '3420.50',
  pending_income: '0.00', pending_expense: '350.00', paid_income_count: 2, paid_expense_count: 5,
  pending_income_count: 0, pending_expense_count: 1, transaction_count: 8,
  expenses_by_category: [{ category_id: categoryId, name: 'Nome anterior', paid: '2379.50', pending: '350.00' }],
}
const service = createApiReportService()
const fetchMock = vi.fn<typeof fetch>()
function response(body: unknown) { return new Response(JSON.stringify(body), { status: 200 }) }

describe('dashboard and report API adapters', () => {
  beforeEach(() => {
    vi.stubGlobal('window', new EventTarget())
    vi.stubGlobal('sessionStorage', { getItem: () => JSON.stringify({ access_token: 'test-access', refresh_token: 'test-refresh' }) })
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset().mockImplementation(async (input) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/categories')) {
        if (url.pathname.includes('/reports/')) return response({ data: report })
        return response({ data: [{ id: categoryId, name: 'Moradia atualizada', type: 'expense', icon: 'home' }] })
      }
      if (url.pathname.endsWith('/transactions')) return response({
        data: [{ id, category_id: categoryId, type: 'expense', amount: 1450, date: '2024-10-10', description: 'Aluguel', status: 'paid', created_at: '2024-10-10T12:00:00Z' }],
        summary: { ...report, next_pending_date: '2024-10-28' },
        metadata: { available_periods: ['2024-10', '2024-09'] },
      })
      const start = url.searchParams.get('start_date')!
      const end = url.searchParams.get('end_date')!
      const date = new Date(`${start}T00:00:00Z`)
      const months = []
      while (date.toISOString().slice(0, 10) <= end) {
        const month = date.getUTCMonth() + 1
        const year = date.getUTCFullYear()
        const selected = year === 2024 && month === 10
        months.push({ year, month, paid_income: selected ? '5800.00' : '0.00', paid_expense: selected ? '2379.50' : '0.00', net: selected ? '3420.50' : '0.00', transaction_count: selected ? 8 : 0 })
        date.setUTCMonth(date.getUTCMonth() + 1)
      }
      return response({ data: { months } })
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('loads six recent records and uses server totals and current category identities', async () => {
    const result = await service.getDashboard('not-authorization', '2024-10')
    expect(result).toMatchObject({ ok: true, data: {
      transactionCount: 8, summary: { balanceCents: 342050, pendingExpenseCents: 35000, nextPendingDate: '2024-10-28' },
      recentTransactions: [{ amountCents: 145000, date: '2024-10-10', category: { name: 'Moradia atualizada' } }],
      expensesByCategory: [{ amountCents: 237950, percentage: 100, category: { name: 'Moradia atualizada' } }],
    } })
    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(Object.fromEntries(url.searchParams)).toEqual({ year: '2024', month: '10', limit: '6', page: '1' })
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer test-access')
    expect(String(url)).not.toContain('not-authorization')
  })

  it.each([
    ['month', '2024-10-01', '2024-10-31', '2024-07-01', 4],
    ['quarter', '2024-08-01', '2024-10-31', '2024-08-01', 3],
    ['year', '2024-01-01', '2024-12-31', '2024-01-01', 12],
  ] as const)('maps %s totals separately from the chart range and preserves empty months', async (range, from, end, chartStart, length) => {
    const result = await service.getReport('ignored', { period: '2024-10', range })
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error.message)
    expect(result.data.months).toHaveLength(length)
    expect(result.data.months.find((month) => month.period === '2024-10')).toMatchObject({ transactionCount: 8, incomeCents: 580000, expenseCents: 237950 })
    expect(result.data.months[0]).toMatchObject({ incomeCents: 0, expenseCents: 0, transactionCount: 0 })
    expect(result.data.summary.balanceCents).toBe(342050)
    expect(result.data.resultRate).toBeCloseTo(342050 / 580000)
    const urls = fetchMock.mock.calls.map(([value]) => new URL(String(value)))
    const totalUrl = urls.find((url) => url.pathname.endsWith('/reports/categories'))!
    const chartUrl = urls.find((url) => url.pathname.endsWith('/reports/monthly'))!
    expect(Object.fromEntries(totalUrl.searchParams)).toEqual({ start_date: from, end_date: end })
    expect(Object.fromEntries(chartUrl.searchParams)).toEqual({ start_date: chartStart, end_date: end })
  })

  it('clamps previous context to the database lower bound and handles leap February', async () => {
    expect(await service.getReport('ignored', { period: '1900-01', range: 'quarter' })).toMatchObject({ ok: true, data: { startPeriod: '1900-01', months: [{ period: '1900-01' }] } })
    fetchMock.mockClear()
    await service.getReport('ignored', { period: '2024-02', range: 'month' })
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('end_date=2024-02-29'))).toBe(true)
  })

  it('rejects invalid periods and cancelled requests before HTTP', async () => {
    expect(await service.getDashboard('ignored', '9999-01')).toMatchObject({ ok: false, error: { code: 'validation' } })
    const controller = new AbortController(); controller.abort()
    expect(await service.getReport('ignored', { period: '2024-10', range: 'month' }, { signal: controller.signal })).toMatchObject({ ok: false, error: { code: 'cancelled' } })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not replace transport failures with a misleading zero summary', async () => {
    fetchMock.mockRejectedValue(new Error('network unavailable'))
    expect(await service.getDashboard('ignored', '2024-10')).toMatchObject({ ok: false, error: { code: 'unavailable' } })
  })
})
