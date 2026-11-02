import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFinanceService } from '../src/services/financeService'
import { createMockFinance } from '../src/mocks/finance'
import type {
  FinanceResult,
  Transaction,
  TransactionDraft,
  TransactionQuery,
} from '../src/types/finance'
import { amountInputValue, MAX_AMOUNT_CENTS, parseBrlAmount } from '../src/utils/financeFormat'
import { readTransactionQuery, writeTransactionQuery } from '../src/utils/transactionQuery'

const owner = 'lucas.mendes@email.com'
const query: TransactionQuery = {
  period: '2024-10',
  type: 'all',
  status: 'all',
  categoryId: 'all',
  search: '',
  page: 1,
}
async function settle<T>(pending: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync()
  return pending
}
function data<T>(result: FinanceResult<T>): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}
function draft(
  transaction: Transaction,
  changes: Partial<TransactionDraft> = {},
): TransactionDraft {
  return {
    type: transaction.type,
    categoryId: transaction.categoryId,
    amount: amountInputValue(transaction.amountCents),
    description: transaction.description,
    status: transaction.status,
    date: transaction.date,
    ...changes,
  }
}

describe('transaction query and lifecycle', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('paginates without limiting the totals and orders by financial date', async () => {
    const service = createFinanceService()
    const first = data(await settle(service.getTransactions(owner, { ...query, period: 'all' })))
    const second = data(
      await settle(service.getTransactions(owner, { ...query, period: 'all', page: 2 })),
    )
    expect(first.total).toBe(11)
    expect(first.items).toHaveLength(8)
    expect(second.items).toHaveLength(3)
    expect(second.summary).toEqual(first.summary)
    expect(first.summary).toMatchObject({
      incomeCents: 1080000,
      expenseCents: 424950,
      balanceCents: 655050,
    })
    const dates = [...first.items, ...second.items].map((item) => item.date)
    expect(dates).toEqual([...dates].sort().reverse())
  })
  it('combines all filters and keeps pending movements outside the balance', async () => {
    const service = createFinanceService()
    const initial = data(await settle(service.getTransactions(owner, query)))
    const internet = initial.items.find((item) => item.description === 'Internet Fibra')!
    const filters = {
      ...query,
      type: 'expense' as const,
      categoryId: internet.categoryId,
      status: 'pending' as const,
      search: ' INTERNET ',
    }
    const matched = data(await settle(service.getTransactions(owner, filters)))
    expect(matched.items.map((item) => item.id)).toEqual([internet.id])
    expect(matched.summary).toMatchObject({ balanceCents: 0, pendingExpenseCents: 35000 })
    expect(
      data(await settle(service.getTransactions(owner, { ...filters, type: 'income' }))),
    ).toMatchObject({ total: 0, items: [] })
  })
  it('searches literal descriptions without accents and normalizes whitespace', async () => {
    const service = createFinanceService()
    expect(
      data(await settle(service.getTransactions(owner, { ...query, search: 'FARMACIA' }))),
    ).toMatchObject({ total: 1 })
    expect(
      data(
        await settle(
          service.getTransactions(owner, {
            ...query,
            period: 'all',
            search: '  salario   MENSAL ',
          }),
        ),
      ),
    ).toMatchObject({ total: 2 })
    expect(
      data(await settle(service.getTransactions(owner, { ...query, search: '.*' }))),
    ).toMatchObject({ total: 0 })
  })
  it('normalizes invalid URL values and round-trips valid filters without trimming the input', () => {
    expect(
      readTransactionQuery(
        new URLSearchParams('period=2024-13&type=bad&status=bad&category=bad&page=-2'),
        '2024-10',
      ),
    ).toEqual(query)
    const selected = {
      ...query,
      period: 'all',
      type: 'expense' as const,
      categoryId: crypto.randomUUID(),
      status: 'pending' as const,
      search: ' dois termos ',
      page: 2,
    }
    expect(readTransactionQuery(writeTransactionQuery(selected), '2024-10')).toEqual(selected)
    expect(readTransactionQuery(new URLSearchParams('page=999999'), '2024-10').page).toBe(10000)
  })
  it('updates pending to paid in the same ledger without changing identity', async () => {
    const service = createFinanceService()
    const initial = data(await settle(service.getTransactions(owner, query)))
    const internet = initial.items.find((item) => item.status === 'pending')!
    const saved = data(
      await settle(
        service.updateTransaction(owner, internet.id, draft(internet, { status: 'paid' })),
      ),
    )
    expect(saved.id).toBe(internet.id)
    expect(saved.createdAt).toBe(internet.createdAt)
    const next = data(await settle(service.getDashboard(owner, '2024-10')))
    expect(next.transactionCount).toBe(8)
    expect(next.summary).toMatchObject({
      expenseCents: 272950,
      balanceCents: 307050,
      pendingCount: 0,
    })
  })
  it('moves and reclassifies a transaction across periods', async () => {
    const service = createFinanceService()
    const initial = data(await settle(service.getTransactions(owner, query)))
    const internet = initial.items.find((item) => item.status === 'pending')!
    const income = initial.categories.find((item) => item.type === 'income')!
    data(
      await settle(
        service.updateTransaction(
          owner,
          internet.id,
          draft(internet, {
            date: '2024-09-30',
            type: 'income',
            categoryId: income.id,
            status: 'paid',
            amount: '400,00',
          }),
        ),
      ),
    )
    expect(data(await settle(service.getDashboard(owner, '2024-10'))).summary).toMatchObject({
      balanceCents: 342050,
      pendingCount: 0,
    })
    expect(data(await settle(service.getDashboard(owner, '2024-09'))).summary.balanceCents).toBe(
      353000,
    )
  })
  it('deletes pending and paid transactions with different effects on balance', async () => {
    const service = createFinanceService()
    const initial = data(await settle(service.getTransactions(owner, query)))
    const pending = initial.items.find((item) => item.status === 'pending')!
    data(await settle(service.deleteTransaction(owner, pending.id)))
    expect(data(await settle(service.getDashboard(owner, '2024-10'))).summary).toMatchObject({
      balanceCents: 342050,
      pendingCount: 0,
    })
    const salary = initial.items.find((item) => item.description === 'Salário Mensal')!
    data(await settle(service.deleteTransaction(owner, salary.id)))
    expect(data(await settle(service.getDashboard(owner, '2024-10'))).summary.balanceCents).toBe(
      -157950,
    )
    expect(await settle(service.deleteTransaction(owner, salary.id))).toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    })
  })
  it('clamps pagination after the last item on a page is deleted', async () => {
    const service = createFinanceService()
    const initial = data(await settle(service.getTransactions(owner, query)))
    const extra = data(
      await settle(
        service.createTransaction(
          owner,
          draft(initial.items[0], { description: 'Extra', date: '2024-10-01' }),
        ),
      ),
    )
    expect(
      data(await settle(service.getTransactions(owner, { ...query, page: 2 }))).items.map(
        (item) => item.id,
      ),
    ).toEqual([extra.id])
    data(await settle(service.deleteTransaction(owner, extra.id)))
    expect(data(await settle(service.getTransactions(owner, { ...query, page: 2 })))).toMatchObject(
      { page: 1, totalPages: 1, total: 8 },
    )
  })
  it('prevents cross-user updates and deletions', async () => {
    const service = createFinanceService()
    const initial = data(await settle(service.getTransactions(owner, query)))
    const other = data(await settle(service.getTransactions('ana@example.com', query)))
    const target = initial.items[0]
    const compatible = other.categories.find((item) => item.type === target.type)!
    expect(
      await settle(
        service.updateTransaction(
          'ana@example.com',
          target.id,
          draft(target, { categoryId: compatible.id }),
        ),
      ),
    ).toMatchObject({ ok: false, error: { code: 'not_found' } })
    expect(await settle(service.deleteTransaction('ana@example.com', target.id))).toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    })
    expect(
      await settle(
        service.updateTransaction(owner, target.id, draft(target, { categoryId: compatible.id })),
      ),
    ).toMatchObject({ ok: false, error: { code: 'validation' } })
    expect(data(await settle(service.getTransactions(owner, query))).items).toEqual(initial.items)
  })
  it('rejects invalid edits without mutating the record', async () => {
    const service = createFinanceService()
    const initial = data(await settle(service.getTransactions(owner, query)))
    const target = initial.items[0]
    for (const changes of [
      { amount: '-1,00' },
      { date: '2024-02-30' },
      { type: 'income' as const },
    ]) {
      expect(
        await settle(service.updateTransaction(owner, target.id, draft(target, changes))),
      ).toMatchObject({ ok: false, error: { code: 'validation' } })
    }
    expect(data(await settle(service.getTransactions(owner, query))).items).toEqual(initial.items)
  })
  it('cancels mutations and handles failures without changing the ledger', async () => {
    const adapter = createMockFinance()
    const service = createFinanceService(adapter)
    const initial = data(await settle(service.getTransactions(owner, query)))
    const target = initial.items[0]
    const controller = new AbortController()
    const update = service.updateTransaction(
      owner,
      target.id,
      draft(target, { amount: '999,00' }),
      { signal: controller.signal },
    )
    const remove = service.deleteTransaction(owner, target.id, { signal: controller.signal })
    controller.abort()
    expect(await settle(update)).toMatchObject({ ok: false, error: { code: 'cancelled' } })
    expect(await settle(remove)).toMatchObject({ ok: false, error: { code: 'cancelled' } })
    expect(
      await settle(service.deleteTransaction(owner, target.id, { simulateFailure: true })),
    ).toMatchObject({ ok: false, error: { code: 'unavailable' } })
    vi.spyOn(adapter, 'updateTransaction').mockRejectedValue(new Error('private implementation'))
    expect(await settle(service.updateTransaction(owner, target.id, draft(target)))).toMatchObject({
      ok: false,
      error: { code: 'unavailable' },
    })
    expect(data(await settle(service.getTransactions(owner, query))).items).toEqual(initial.items)
  })
  it('round-trips edit values exactly up to the monetary limit', () => {
    for (const cents of [1, 10, 125050, MAX_AMOUNT_CENTS])
      expect(parseBrlAmount(amountInputValue(cents))).toBe(cents)
  })
})
