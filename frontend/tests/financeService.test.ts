import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFinanceService } from '../src/services/financeService'
import { createMockFinance } from '../src/mocks/finance'
import type { DashboardSnapshot, FinanceResult, TransactionDraft } from '../src/types/finance'

const owner = 'lucas.mendes@email.com'
async function settle<T>(pending: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync()
  return pending
}
function data<T>(result: FinanceResult<T>): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}
function draft(
  snapshot: DashboardSnapshot,
  changes: Partial<TransactionDraft> = {},
): TransactionDraft {
  return {
    type: 'expense',
    amount: '0,10',
    description: 'Teste',
    date: '2024-10-25',
    status: 'paid',
    categoryId: snapshot.categories.find((item) => item.type === 'expense')!.id,
    ...changes,
  }
}

describe('dashboard and transaction services', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('derives the reference totals, pending amounts and chart from the same records', async () => {
    const service = createFinanceService()
    const snapshot = data(await settle(service.getDashboard(owner, '2024-10')))
    expect(snapshot.summary).toEqual({
      incomeCents: 580000,
      expenseCents: 237950,
      balanceCents: 342050,
      paidIncomeCount: 2,
      paidExpenseCount: 5,
      pendingIncomeCents: 0,
      pendingExpenseCents: 35000,
      pendingCount: 1,
      nextPendingDate: '2024-10-28',
    })
    expect(snapshot.transactionCount).toBe(8)
    expect(snapshot.expensesByCategory.reduce((sum, item) => sum + item.amountCents, 0)).toBe(
      snapshot.summary.expenseCents,
    )
    expect(snapshot.expensesByCategory.reduce((sum, item) => sum + item.percentage, 0)).toBeCloseTo(
      100,
    )
    expect(snapshot.recentTransactions).toHaveLength(6)
    expect(snapshot.recentTransactions[0].date).toBe('2024-10-28')
    expect(snapshot.recentTransactions.map((item) => item.date)).toEqual(
      snapshot.recentTransactions
        .map((item) => item.date)
        .sort()
        .reverse(),
    )
  })
  it('filters by month and returns zero values without NaN for an empty period', async () => {
    const service = createFinanceService()
    const september = data(await settle(service.getDashboard(owner, '2024-09')))
    expect(september.summary.balanceCents).toBe(313000)
    expect(september.transactionCount).toBe(3)
    const empty = data(await settle(service.getDashboard(owner, '2024-08')))
    expect(empty.summary.balanceCents).toBe(0)
    expect(empty.recentTransactions).toEqual([])
    expect(empty.expensesByCategory).toEqual([])
  })
  it('updates paid totals exactly and excludes pending income and expense', async () => {
    const service = createFinanceService()
    const initial = data(await settle(service.getDashboard(owner, '2024-10')))
    data(await settle(service.createTransaction(owner, draft(initial, { amount: '0,10' }))))
    data(await settle(service.createTransaction(owner, draft(initial, { amount: '0,20' }))))
    data(
      await settle(
        service.createTransaction(owner, draft(initial, { amount: '10,00', status: 'pending' })),
      ),
    )
    data(
      await settle(
        service.createTransaction(
          owner,
          draft(initial, {
            amount: '20,00',
            status: 'pending',
            type: 'income',
            categoryId: initial.categories.find((item) => item.type === 'income')!.id,
          }),
        ),
      ),
    )
    const next = data(await settle(service.getDashboard(owner, '2024-10')))
    expect(next.summary.expenseCents).toBe(237980)
    expect(next.summary.balanceCents).toBe(342020)
    expect(next.summary.pendingExpenseCents).toBe(36000)
    expect(next.summary.pendingIncomeCents).toBe(2000)
    expect(next.summary.pendingCount).toBe(3)
  })
  it('isolates users and does not expose mutable store records', async () => {
    const service = createFinanceService()
    const first = data(await settle(service.getDashboard(owner, '2024-10')))
    first.categories[0].name = 'External mutation'
    first.recentTransactions[0].amountCents = 1
    const other = data(await settle(service.getDashboard('ana@example.com', '2024-10')))
    expect(other.transactionCount).toBe(0)
    expect(other.summary.balanceCents).toBe(0)
    expect(data(await settle(service.getDashboard(owner, '2024-10'))).categories[0].name).toBe(
      'Moradia',
    )
    expect(await settle(service.createTransaction('ana@example.com', draft(first)))).toMatchObject({
      ok: false,
      error: { code: 'validation', fields: { categoryId: expect.any(String) } },
    })
  })
  it('rejects category/type mismatch and invalid amounts without writing', async () => {
    const service = createFinanceService()
    const initial = data(await settle(service.getDashboard(owner, '2024-10')))
    expect(
      await settle(service.createTransaction(owner, draft(initial, { type: 'income' }))),
    ).toMatchObject({ ok: false, error: { code: 'validation' } })
    expect(
      await service.createTransaction(owner, draft(initial, { amount: '-1,00' })),
    ).toMatchObject({ ok: false, error: { code: 'validation' } })
    expect(data(await settle(service.getDashboard(owner, '2024-10'))).transactionCount).toBe(8)
  })
  it('adds a new period and can represent a negative balance', async () => {
    const service = createFinanceService()
    const initial = data(await settle(service.getDashboard(owner, '2024-10')))
    data(
      await settle(
        service.createTransaction(owner, draft(initial, { amount: '100,50', date: '2025-01-01' })),
      ),
    )
    const next = data(await settle(service.getDashboard(owner, '2025-01')))
    expect(next.availablePeriods).toContain('2025-01')
    expect(next.summary.balanceCents).toBe(-10050)
  })
  it('handles invalid periods, cancellation and simulated failures without side effects', async () => {
    const service = createFinanceService()
    expect(await service.getDashboard(owner, '2024-13')).toMatchObject({
      ok: false,
      error: { code: 'validation' },
    })
    expect(
      await settle(service.getDashboard(owner, '2024-10', { simulateFailure: true })),
    ).toMatchObject({ ok: false, error: { code: 'unavailable' } })
    const initial = data(await settle(service.getDashboard(owner, '2024-10')))
    const controller = new AbortController()
    const pending = service.createTransaction(owner, draft(initial), { signal: controller.signal })
    controller.abort()
    expect(await settle(pending)).toMatchObject({ ok: false, error: { code: 'cancelled' } })
    expect(data(await settle(service.getDashboard(owner, '2024-10'))).transactionCount).toBe(8)
  })
  it('converts adapter failures and inconsistent category data to a recoverable error', async () => {
    const adapter = createMockFinance()
    vi.spyOn(adapter, 'listCategories').mockResolvedValue([])
    expect(
      await settle(createFinanceService(adapter).getDashboard(owner, '2024-10')),
    ).toMatchObject({ ok: false, error: { code: 'unavailable' } })
    const failing = createMockFinance()
    vi.spyOn(failing, 'createTransaction').mockRejectedValue(new Error('internal details'))
    const service = createFinanceService(failing)
    const initial = data(await settle(service.getDashboard(owner, '2024-10')))
    const result = await settle(service.createTransaction(owner, draft(initial)))
    expect(result).toMatchObject({ ok: false, error: { code: 'unavailable' } })
    expect(JSON.stringify(result)).not.toContain('internal details')
  })
})
