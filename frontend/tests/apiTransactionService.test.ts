import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiTransactionService } from '../src/services/apiTransactionService'
import { centsFromApi } from '../src/utils/apiTransaction'
import type { TransactionDraft, TransactionQuery } from '../src/types/finance'

const id = '9a5a9abc-982b-4d7d-8e36-99e37d4b369f'
const categoryId = 'e63f7ed1-f51c-42c6-b379-e1065ed6b041'
const row = { id, category_id: categoryId, type: 'expense', amount: 420.30, date: '2024-10-14', description: 'Mercado', status: 'paid', created_at: '2024-10-14T12:00:00.000Z' }
const draft: TransactionDraft = { categoryId, type: 'expense', amount: '1.250,50', date: '2024-10-14', description: '  Mercado  ', status: 'pending' }
const query: TransactionQuery = { period: '2024-10', type: 'expense', categoryId, status: 'paid', search: '10%_', page: 2 }
const summary = { paid_income: '5000.00', paid_expense: '420.30', available_balance: '4579.70', pending_income: '0.00', pending_expense: '350.00', paid_income_count: 1, paid_expense_count: 3, pending_income_count: 0, pending_expense_count: 1, next_pending_date: '2024-10-28' }
const service = createApiTransactionService()
const fetchMock = vi.fn<typeof fetch>()
function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(status === 204 ? null : JSON.stringify(body), { status }))
}

describe('real transaction transport and server aggregates', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', new EventTarget())
    vi.stubGlobal('sessionStorage', { getItem: () => JSON.stringify({ access_token: 'test-access', refresh_token: 'test-refresh' }) })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('maps filters and page, keeps financial dates and uses totals from all server results', async () => {
    respond({ data: [row], pagination: { page: 2, limit: 8, total: 9, pages: 2 }, metadata: { total_records: 25, available_periods: ['2024-10', '2024-09'] }, summary })
    respond({ data: [{ id: categoryId, name: 'Alimentação', type: 'expense', icon: 'restaurant' }] })
    const response = await service.getTransactions('ignored-owner', query)
    expect(response).toMatchObject({ ok: true, data: {
      page: 2, total: 9, totalRecords: 25, totalPages: 2,
      items: [{ amountCents: 42030, date: '2024-10-14', category: { id: categoryId } }],
      summary: { incomeCents: 500000, expenseCents: 42030, balanceCents: 457970, pendingExpenseCents: 35000, paidExpenseCount: 3 },
    } })
    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(Object.fromEntries(url.searchParams)).toEqual({ year: '2024', month: '10', page: '2', limit: '8', type: 'expense', category_id: categoryId, status: 'paid', search: '10%_' })
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer test-access')
    expect(String(url)).not.toContain('ignored-owner')
  })
  it('converts BRL input to numeric reais and sends category_id without a client owner', async () => {
    respond({ data: { ...row, amount: 1250.50, status: 'pending' } }, 201)
    expect(await service.createTransaction('ignored', draft)).toMatchObject({ ok: true, data: { amountCents: 125050, categoryId } })
    const init = fetchMock.mock.calls[0][1]
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ category_id: categoryId, type: 'expense', amount: 1250.50, date: '2024-10-14', description: 'Mercado', status: 'pending' })
  })
  it('edits with PATCH and accepts empty 204 delete responses', async () => {
    respond({ data: row })
    expect(await service.updateTransaction('ignored', id, draft)).toMatchObject({ ok: true, data: { id } })
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PATCH')
    respond(null, 204)
    expect(await service.deleteTransaction('ignored', id)).toEqual({ ok: true, data: null })
  })
  it.each(['INVALID_CATEGORY', 'CATEGORY_CONFLICT'])('presents %s on the category field', async (code) => {
    respond({ error: { code, message: 'Categoria incompatível.' } }, code === 'CATEGORY_CONFLICT' ? 409 : 400)
    expect(await service.createTransaction('ignored', draft)).toMatchObject({ ok: false, error: { code: 'validation', fields: { categoryId: 'Categoria incompatível.' } } })
  })
  it('maps API validation paths to frontend fields and preserves missing-record errors', async () => {
    respond({ error: { code: 'VALIDATION_ERROR', message: 'Revise os campos.', issues: [{ path: 'category_id', message: 'Categoria inválida.' }] } }, 400)
    expect(await service.createTransaction('ignored', draft)).toMatchObject({ ok: false, error: { fields: { categoryId: 'Categoria inválida.' } } })
    respond({ error: { code: 'NOT_FOUND', message: 'Lançamento não encontrado.' } }, 404)
    expect(await service.deleteTransaction('ignored', id)).toMatchObject({ ok: false, error: { code: 'not_found' } })
  })
  it('blocks invalid money, unsupported dates and already cancelled writes before HTTP', async () => {
    expect(await service.createTransaction('ignored', { ...draft, amount: '1,001' })).toMatchObject({ ok: false, error: { code: 'validation' } })
    expect(await service.createTransaction('ignored', { ...draft, date: '1899-12-31' })).toMatchObject({ ok: false, error: { code: 'validation' } })
    const controller = new AbortController(); controller.abort()
    expect(await service.createTransaction('ignored', draft, { signal: controller.signal })).toMatchObject({ ok: false, error: { code: 'cancelled' } })
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('converts decimal values exactly and refuses unsafe aggregate precision', () => {
    expect(centsFromApi('0.29')).toBe(29)
    expect(centsFromApi('-12.34')).toBe(-1234)
    expect(() => centsFromApi('900719925474099.99')).toThrow()
  })
})
