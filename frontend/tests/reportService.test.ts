import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockFinance } from '../src/mocks/finance'
import { createReportService } from '../src/services/reportService'
import { createFinanceService } from '../src/services/financeService'
import { createCategoryService } from '../src/services/categoryService'
import type { FinanceResult } from '../src/types/finance'
import { readReportQuery, reportPeriods, writeReportQuery } from '../src/utils/reportPeriods'

const owner = 'lucas.mendes@email.com'
const query = { period: '2024-10', range: 'month' as const }
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
    reports: createReportService(adapter),
    finance: createFinanceService(adapter),
    categories: createCategoryService(adapter),
  }
}

describe('financial reports', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  it('matches the dashboard and selected month while charting four months of context', async () => {
    const { reports, finance } = setup()
    const report = data(await settle(reports.getReport(owner, query)))
    const dashboard = data(await settle(finance.getDashboard(owner, query.period)))
    expect(report.summary).toEqual(dashboard.summary)
    expect(report.expensesByCategory).toEqual(dashboard.expensesByCategory)
    expect(report.transactionCount).toBe(8)
    expect(report.startPeriod).toBe('2024-10')
    expect(report.endPeriod).toBe('2024-10')
    expect(report.months.map((item) => item.period)).toEqual([
      '2024-07',
      '2024-08',
      '2024-09',
      '2024-10',
    ])
    expect(report.months[2].balanceCents).toBe(313000)
    expect(report.resultRate).toBeCloseTo(342050 / 580000)
  })
  it('consolidates a rolling three-month interval and all category totals exactly', async () => {
    const { reports } = setup()
    const report = data(await settle(reports.getReport(owner, { ...query, range: 'quarter' })))
    expect(report).toMatchObject({
      startPeriod: '2024-08',
      endPeriod: '2024-10',
      transactionCount: 11,
    })
    expect(report.summary).toMatchObject({
      incomeCents: 1080000,
      expenseCents: 424950,
      balanceCents: 655050,
      pendingExpenseCents: 35000,
    })
    expect(report.months.reduce((sum, item) => sum + item.incomeCents, 0)).toBe(
      report.summary.incomeCents,
    )
    expect(report.months.reduce((sum, item) => sum + item.expenseCents, 0)).toBe(
      report.summary.expenseCents,
    )
    expect(report.expensesByCategory.reduce((sum, item) => sum + item.amountCents, 0)).toBe(
      report.summary.expenseCents,
    )
    expect(report.expensesByCategory.reduce((sum, item) => sum + item.percentage, 0)).toBeCloseTo(
      100,
    )
  })
  it('returns every month of the selected calendar year without inventing values', async () => {
    const { reports } = setup()
    const report = data(
      await settle(reports.getReport(owner, { period: '2024-02', range: 'year' })),
    )
    expect(report).toMatchObject({ startPeriod: '2024-01', endPeriod: '2024-12' })
    expect(report.months).toHaveLength(12)
    expect(report.months[0]).toMatchObject({ period: '2024-01', incomeCents: 0, expenseCents: 0 })
    expect(report.months[11]).toMatchObject({ period: '2024-12', incomeCents: 0, expenseCents: 0 })
    expect(report.summary.balanceCents).toBe(655050)
  })
  it('handles rolling year boundaries, leap months and supported calendar limits', () => {
    expect(reportPeriods({ period: '2025-01', range: 'quarter' })).toEqual({
      start: '2024-11',
      end: '2025-01',
      chart: ['2024-11', '2024-12', '2025-01'],
    })
    expect(reportPeriods({ period: '2024-02', range: 'month' }).chart).toEqual([
      '2023-11',
      '2023-12',
      '2024-01',
      '2024-02',
    ])
    expect(reportPeriods({ period: '0001-01', range: 'quarter' })).toEqual({
      start: '0001-01',
      end: '0001-01',
      chart: ['0001-01'],
    })
    expect(reportPeriods({ period: '9999-12', range: 'year' }).chart.at(-1)).toBe('9999-12')
  })
  it('normalizes invalid URL values and round-trips valid period filters', () => {
    expect(readReportQuery(new URLSearchParams('period=2024-13&range=bad'), '2024-10')).toEqual(
      query,
    )
    const selected = { period: '2025-01', range: 'quarter' as const }
    expect(readReportQuery(writeReportQuery(selected), '2024-10')).toEqual(selected)
  })
  it('returns empty and pending-only periods without a fabricated rate or distribution', async () => {
    const { reports, finance } = setup()
    const empty = data(await settle(reports.getReport(owner, { period: '2025-01', range: 'year' })))
    expect(empty).toMatchObject({ transactionCount: 0, resultRate: null, expensesByCategory: [] })
    expect(empty.months.every((item) => item.incomeCents === 0 && item.expenseCents === 0)).toBe(
      true,
    )
    const dashboard = data(await settle(finance.getDashboard(owner, '2025-01')))
    data(
      await settle(
        finance.createTransaction(owner, {
          type: 'expense',
          categoryId: dashboard.categories[0].id,
          description: 'Futura',
          amount: '100,00',
          date: '2025-01-20',
          status: 'pending',
        }),
      ),
    )
    const pending = data(
      await settle(reports.getReport(owner, { period: '2025-01', range: 'month' })),
    )
    expect(pending).toMatchObject({ transactionCount: 1, resultRate: null, expensesByCategory: [] })
    expect(pending.summary).toMatchObject({
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0,
      pendingExpenseCents: 10000,
    })
  })
  it('includes boundary dates and exact cents while excluding pending entries', async () => {
    const { reports, finance } = setup()
    const dashboard = data(await settle(finance.getDashboard(owner, '2025-01')))
    const category = dashboard.categories.find((item) => item.type === 'income')!
    for (const [date, amount, status] of [
      ['2024-11-01', '0,10', 'paid'],
      ['2025-01-31', '0,20', 'paid'],
      ['2024-10-31', '99,00', 'paid'],
      ['2025-02-01', '99,00', 'paid'],
      ['2025-01-01', '99,00', 'pending'],
    ] as const)
      data(
        await settle(
          finance.createTransaction(owner, {
            type: 'income',
            categoryId: category.id,
            description: 'Limite',
            amount,
            date,
            status,
          }),
        ),
      )
    const report = data(
      await settle(reports.getReport(owner, { period: '2025-01', range: 'quarter' })),
    )
    expect(report.summary).toMatchObject({
      incomeCents: 30,
      expenseCents: 0,
      balanceCents: 30,
      pendingIncomeCents: 9900,
    })
    expect(report.resultRate).toBe(1)
  })
  it('represents a deficit and a negative result rate', async () => {
    const { reports, finance } = setup()
    const snapshot = data(await settle(finance.getDashboard(owner, '2024-10')))
    data(
      await settle(
        finance.createTransaction(owner, {
          type: 'expense',
          categoryId: snapshot.categories[0].id,
          amount: '5000,00',
          date: '2024-10-31',
          description: 'Despesa extra',
          status: 'paid',
        }),
      ),
    )
    const report = data(await settle(reports.getReport(owner, query)))
    expect(report.summary.balanceCents).toBe(-157950)
    expect(report.resultRate).toBeCloseTo(-157950 / 580000)
  })
  it('reflects creation, editing, deletion and category renaming from the shared adapter', async () => {
    const { reports, finance, categories } = setup()
    const initial = data(await settle(finance.getDashboard(owner, '2024-10')))
    const category = initial.categories[0]
    const draft = {
      type: 'expense' as const,
      categoryId: category.id,
      description: 'Material',
      amount: '100,00',
      date: '2024-10-31',
      status: 'paid' as const,
    }
    const created = data(await settle(finance.createTransaction(owner, draft)))
    expect(data(await settle(reports.getReport(owner, query))).summary.balanceCents).toBe(332050)
    data(
      await settle(finance.updateTransaction(owner, created.id, { ...draft, date: '2024-09-30' })),
    )
    expect(data(await settle(reports.getReport(owner, query))).summary.balanceCents).toBe(342050)
    data(
      await settle(
        categories.updateCategory(owner, category.id, {
          name: 'Casa',
          type: 'expense',
          description: '',
          color: 'var(--color-primary)',
          icon: 'home',
        }),
      ),
    )
    expect(
      data(await settle(reports.getReport(owner, query))).expensesByCategory[0].category.name,
    ).toBe('Casa')
    data(await settle(finance.deleteTransaction(owner, created.id)))
    expect(
      data(await settle(reports.getReport(owner, { ...query, range: 'quarter' }))).summary
        .balanceCents,
    ).toBe(655050)
  })
  it('isolates users and returns detached report data', async () => {
    const { reports } = setup()
    const first = data(await settle(reports.getReport(owner, query)))
    first.months[0].incomeCents = 123
    first.expensesByCategory[0].category.name = 'External mutation'
    const next = data(await settle(reports.getReport(owner, query)))
    expect(next.months[0].incomeCents).toBe(0)
    expect(next.expensesByCategory[0].category.name).toBe('Moradia')
    expect(data(await settle(reports.getReport('ana@example.com', query)))).toMatchObject({
      transactionCount: 0,
      resultRate: null,
      expensesByCategory: [],
    })
  })
  it('rejects invalid queries and handles cancellation and adapter failures', async () => {
    const { reports, adapter } = setup()
    expect(await reports.getReport(owner, { ...query, period: '0000-01' })).toMatchObject({
      ok: false,
      error: { code: 'validation' },
    })
    expect(await reports.getReport('', query)).toMatchObject({
      ok: false,
      error: { code: 'validation' },
    })
    expect(await settle(reports.getReport(owner, query, { simulateFailure: true }))).toMatchObject({
      ok: false,
      error: { code: 'unavailable' },
    })
    const controller = new AbortController()
    const pending = reports.getReport(owner, query, { signal: controller.signal })
    controller.abort()
    expect(await settle(pending)).toMatchObject({ ok: false, error: { code: 'cancelled' } })
    vi.spyOn(adapter, 'listTransactions').mockRejectedValue(new Error('private details'))
    const failure = await settle(reports.getReport(owner, query))
    expect(failure).toMatchObject({ ok: false, error: { code: 'unavailable' } })
    expect(JSON.stringify(failure)).not.toContain('private details')
  })
  it('reports inconsistent categories as a recoverable error', async () => {
    const { reports, adapter } = setup()
    vi.spyOn(adapter, 'listCategories').mockResolvedValue([])
    expect(await settle(reports.getReport(owner, query))).toMatchObject({
      ok: false,
      error: { code: 'unavailable' },
    })
  })
})
