import { z } from 'zod'
import type { FinanceRequestOptions, FinanceResult, Transaction, TransactionDraft, TransactionListSnapshot, TransactionQuery } from '../types/finance'
import { apiCategorySchema, categoryFromApi } from '../utils/apiCategory'
import { apiSummarySchema, apiTransactionInputSchema, apiTransactionQuerySchema, apiTransactionSchema, currentFinancialPeriod, summaryFromApi, transactionFromApi, transactionParams } from '../utils/apiTransaction'
import { parseBrlAmount } from '../utils/financeFormat'
import { transactionFieldErrors } from '../utils/transactionValidation'
import { api, ApiError } from './api'

const listSchema = z.object({
  data: z.array(apiTransactionSchema),
  pagination: z.object({ page: z.number().int().positive(), limit: z.number().int().positive(), total: z.number().int().nonnegative(), pages: z.number().int().nonnegative() }),
  metadata: z.object({ total_records: z.number().int().nonnegative(), available_periods: z.array(z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)) }),
  summary: apiSummarySchema,
})

async function request<T>(operation: () => Promise<T>, options: FinanceRequestOptions): Promise<FinanceResult<T>> {
  try {
    options.signal?.throwIfAborted()
    if (options.simulateFailure) return { ok: false, error: { code: 'unavailable', message: 'Não foi possível carregar as transações.' } }
    return { ok: true, data: await operation() }
  } catch (error) {
    if (options.signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      return { ok: false, error: { code: 'cancelled', message: 'Operação cancelada.' } }
    }
    if (error instanceof ApiError) {
      const fields = Object.fromEntries(Object.entries(error.fields ?? {}).map(([key, value]) => [key === 'category_id' ? 'categoryId' : key, value]))
      if (error.code === 'INVALID_CATEGORY' || error.code === 'CATEGORY_CONFLICT') fields.categoryId = error.message
      return { ok: false, error: {
        code: error.status === 404 ? 'not_found' : error.status === 400 || error.code === 'CATEGORY_CONFLICT' ? 'validation' : 'unavailable',
        message: error.message, fields,
      } }
    }
    return { ok: false, error: { code: 'unavailable', message: 'Não foi possível acessar as transações. Tente novamente.' } }
  }
}

export function createApiTransactionService() {
  async function save(path: string, method: 'POST' | 'PATCH', input: TransactionDraft, options: FinanceRequestOptions): Promise<FinanceResult<Transaction>> {
    const parsed = apiTransactionInputSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: { code: 'validation', message: 'Revise os campos informados.', fields: transactionFieldErrors(parsed.error.issues) } }
    const { categoryId, amount, ...values } = parsed.data
    const cents = parseBrlAmount(amount)!
    return request(async () => {
      const response = z.object({ data: apiTransactionSchema }).parse(await api<unknown>(path, {
        method, signal: options.signal,
        body: JSON.stringify({ ...values, category_id: categoryId, amount: cents / 100 }),
      }))
      return transactionFromApi(response.data)
    }, options)
  }

  return {
    getTransactions(_scope: string, query: TransactionQuery, options: FinanceRequestOptions = {}): Promise<FinanceResult<TransactionListSnapshot>> {
      const parsed = apiTransactionQuerySchema.safeParse(query)
      if (!parsed.success) return Promise.resolve({ ok: false, error: { code: 'validation', message: 'Revise os filtros. Use datas entre 1900 e 9998 e busca de até 100 caracteres.' } })
      return request(async () => {
        const [listBody, categoryBody] = await Promise.all([
          api<unknown>(`/transactions?${transactionParams(parsed.data)}`, { signal: options.signal }),
          api<unknown>('/categories', { signal: options.signal }),
        ])
        const response = listSchema.parse(listBody)
        const categories = z.object({ data: z.array(apiCategorySchema) }).parse(categoryBody).data.map(categoryFromApi)
        const items = response.data.map((row) => {
          const transaction = transactionFromApi(row)
          const category = categories.find((item) => item.id === transaction.categoryId && item.type === transaction.type)
          if (!category) throw new Error('Categoria não disponível. Atualize a listagem.')
          return { ...transaction, category }
        })
        return {
          items, total: response.pagination.total, totalRecords: response.metadata.total_records,
          page: response.pagination.page, pageSize: response.pagination.limit,
          totalPages: Math.max(1, response.pagination.pages), categories,
          availablePeriods: [...new Set([
            currentFinancialPeriod(), ...(query.period === 'all' ? [] : [query.period]), ...response.metadata.available_periods,
          ])].sort().reverse(),
          summary: summaryFromApi(response.summary),
        }
      }, options)
    },
    createTransaction(_scope: string, input: TransactionDraft, options: FinanceRequestOptions = {}) {
      return save('/transactions', 'POST', input, options)
    },
    updateTransaction(_scope: string, id: string, input: TransactionDraft, options: FinanceRequestOptions = {}): Promise<FinanceResult<Transaction>> {
      if (!z.uuid().safeParse(id).success) return Promise.resolve({ ok: false, error: { code: 'validation', message: 'Identificador de transação inválido.' } })
      return save(`/transactions/${id}`, 'PATCH', input, options)
    },
    deleteTransaction(_scope: string, id: string, options: FinanceRequestOptions = {}): Promise<FinanceResult<null>> {
      if (!z.uuid().safeParse(id).success) return Promise.resolve({ ok: false, error: { code: 'validation', message: 'Identificador de transação inválido.' } })
      return request(async () => {
        await api(`/transactions/${id}`, { method: 'DELETE', signal: options.signal })
        return null
      }, options)
    },
  }
}

export const transactionService = createApiTransactionService()
