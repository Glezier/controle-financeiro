import { z } from 'zod'
import type { DashboardSummary, Transaction, TransactionQuery } from '../types/finance'
import { isFinancialDate } from './financeFormat'
import { transactionSchema } from './transactionValidation'
import { transactionQuerySchema } from './transactionQuery'

export function currentFinancialPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function centsFromApi(value: string | number): number {
  const text = String(value)
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) throw new Error('Valor monetário inválido na API.')
  const negative = text.startsWith('-')
  const [whole, fraction = ''] = text.replace(/^-/, '').split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents)) throw new Error('Valor fora do limite de precisão.')
  return negative ? -cents : cents
}

export const apiTransactionInputSchema = transactionSchema.extend({
  description: z.string().trim().min(1, 'Informe uma descrição.').max(300, 'Use até 300 caracteres na descrição.'),
  date: z.string().refine((value) => isFinancialDate(value) && value >= '1900-01-01', 'Informe uma data válida a partir de 1900.'),
})
export const apiTransactionQuerySchema = transactionQuerySchema.extend({
  search: z.string().trim().max(100, 'Use até 100 caracteres na busca.'),
  period: z.string().refine((value) => value === 'all' ||
    (/^\d{4}-(0[1-9]|1[0-2])$/.test(value) && value >= '1900-01' && value <= '9998-12')),
})

export const apiTransactionSchema = z.object({
  id: z.uuid(), category_id: z.uuid(), type: z.enum(['income', 'expense']),
  amount: z.number().positive(), date: z.string().refine(isFinancialDate),
  description: z.string(), status: z.enum(['paid', 'pending']), created_at: z.iso.datetime({ offset: true }),
})
const count = z.number().int().nonnegative()
const money = z.union([z.string(), z.number()])
export const apiSummarySchema = z.object({
  paid_income: money, paid_expense: money, available_balance: money,
  pending_income: money, pending_expense: money,
  paid_income_count: count, paid_expense_count: count,
  pending_income_count: count, pending_expense_count: count,
  next_pending_date: z.string().refine(isFinancialDate).nullable(),
})

export function transactionFromApi(row: z.infer<typeof apiTransactionSchema>): Transaction {
  return {
    id: row.id, categoryId: row.category_id, type: row.type,
    amountCents: centsFromApi(row.amount), date: row.date,
    description: row.description, status: row.status, createdAt: row.created_at,
  }
}

export function summaryFromApi(row: z.infer<typeof apiSummarySchema>): DashboardSummary {
  return {
    incomeCents: centsFromApi(row.paid_income), expenseCents: centsFromApi(row.paid_expense),
    balanceCents: centsFromApi(row.available_balance),
    pendingIncomeCents: centsFromApi(row.pending_income), pendingExpenseCents: centsFromApi(row.pending_expense),
    paidIncomeCount: row.paid_income_count, paidExpenseCount: row.paid_expense_count,
    pendingCount: row.pending_income_count + row.pending_expense_count,
    nextPendingDate: row.next_pending_date,
  }
}

export function transactionParams(query: TransactionQuery): URLSearchParams {
  const params = new URLSearchParams({ page: String(query.page), limit: '8' })
  if (query.period !== 'all') {
    const [year, month] = query.period.split('-')
    params.set('year', year)
    params.set('month', String(Number(month)))
  }
  if (query.type !== 'all') params.set('type', query.type)
  if (query.status !== 'all') params.set('status', query.status)
  if (query.categoryId !== 'all') params.set('category_id', query.categoryId)
  if (query.search) params.set('search', query.search)
  return params
}
