import { z } from 'zod'
import type {
  Category,
  Transaction,
  TransactionListSnapshot,
  TransactionQuery,
} from '../types/finance'
import { isFinancialPeriod } from './financeFormat'
import { availableFinancialPeriods, summarizeTransactions } from './financialSummary'

export const TRANSACTION_PAGE_SIZE = 8
export const transactionQuerySchema = z.object({
  period: z.string().refine((value) => value === 'all' || isFinancialPeriod(value)),
  type: z.enum(['all', 'income', 'expense']),
  categoryId: z.union([z.literal('all'), z.uuid()]),
  status: z.enum(['all', 'paid', 'pending']),
  search: z.string().max(200),
  page: z.number().int().min(1).max(10000),
})

export function readTransactionQuery(
  params: URLSearchParams,
  defaultPeriod: string,
): TransactionQuery {
  const period = params.get('period') ?? defaultPeriod
  const type = params.get('type')
  const status = params.get('status')
  const category = params.get('category') ?? 'all'
  const page = Number(params.get('page') ?? 1)
  return {
    period: period === 'all' || isFinancialPeriod(period) ? period : defaultPeriod,
    type: type === 'income' || type === 'expense' ? type : 'all',
    status: status === 'paid' || status === 'pending' ? status : 'all',
    categoryId: z.uuid().safeParse(category).success ? category : 'all',
    search: (params.get('q') ?? '').slice(0, 100),
    page: Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1,
  }
}

export function writeTransactionQuery(query: TransactionQuery): URLSearchParams {
  const params = new URLSearchParams({ period: query.period })
  if (query.type !== 'all') params.set('type', query.type)
  if (query.status !== 'all') params.set('status', query.status)
  if (query.categoryId !== 'all') params.set('category', query.categoryId)
  if (query.search) params.set('q', query.search)
  if (query.page > 1) params.set('page', String(query.page))
  return params
}

function normalizedSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
    .replace(/\s+/g, ' ')
}

export function selectTransactions(
  categories: Category[],
  transactions: Transaction[],
  query: TransactionQuery,
): TransactionListSnapshot {
  const search = normalizedSearch(query.search)
  const matched = transactions
    .map((item) => {
      const category = categories.find(
        (candidate) => candidate.id === item.categoryId && candidate.type === item.type,
      )
      if (!category) throw new Error('Inconsistent transaction category')
      return { ...item, category }
    })
    .filter(
      (item) =>
        (query.period === 'all' || item.date.startsWith(`${query.period}-`)) &&
        (query.type === 'all' || item.type === query.type) &&
        (query.status === 'all' || item.status === query.status) &&
        (query.categoryId === 'all' || item.categoryId === query.categoryId) &&
        (!search || normalizedSearch(item.description).includes(search)),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.createdAt.localeCompare(a.createdAt) ||
        a.id.localeCompare(b.id),
    )
  const totalPages = Math.max(1, Math.ceil(matched.length / TRANSACTION_PAGE_SIZE))
  const page = Math.min(query.page, totalPages)
  return structuredClone({
    items: matched.slice((page - 1) * TRANSACTION_PAGE_SIZE, page * TRANSACTION_PAGE_SIZE),
    total: matched.length,
    totalRecords: transactions.length,
    page,
    pageSize: TRANSACTION_PAGE_SIZE,
    totalPages,
    categories,
    availablePeriods: availableFinancialPeriods(transactions, query.period),
    summary: summarizeTransactions(matched),
  })
}
