import { z } from 'zod'
import type { Category, CategoryExpense, DashboardSnapshot, FinanceRequestOptions, FinanceResult } from '../types/finance'
import type { ReportQuery, ReportSnapshot } from '../types/reports'
import { apiCategorySchema, categoryFromApi } from '../utils/apiCategory'
import { apiSummarySchema, apiTransactionSchema, centsFromApi, currentFinancialPeriod, summaryFromApi, transactionFromApi } from '../utils/apiTransaction'
import { reportPeriods, reportQuerySchema } from '../utils/reportPeriods'
import { api, ApiError } from './api'

export function isApiPeriod(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && value >= '1900-01' && value <= '9998-12'
}

const count = z.number().int().nonnegative()
const money = z.union([z.string(), z.number()])
const reportSchema = apiSummarySchema.extend({
  next_pending_date: apiSummarySchema.shape.next_pending_date.default(null),
  transaction_count: count,
  expenses_by_category: z.array(z.object({ category_id: z.uuid(), name: z.string(), paid: money, pending: money })),
})
const categoriesSchema = z.object({ data: z.array(apiCategorySchema) })
const dashboardSchema = z.object({
  data: z.array(apiTransactionSchema), summary: reportSchema,
  metadata: z.object({ available_periods: z.array(z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)) }),
})
const monthlySchema = z.object({ data: z.object({ months: z.array(z.object({
  year: z.number().int(), month: z.number().int().min(1).max(12),
  paid_income: money, paid_expense: money, net: money, transaction_count: count,
})) }) })

function distribution(report: z.infer<typeof reportSchema>, categories: Category[]): CategoryExpense[] {
  const total = centsFromApi(report.paid_expense)
  return report.expenses_by_category.map((item) => {
    const category = categories.find((category) => category.id === item.category_id && category.type === 'expense')
    if (!category) throw new Error('Categoria do relatório indisponível.')
    const amountCents = centsFromApi(item.paid)
    return { category, amountCents, percentage: total > 0 ? amountCents / total * 100 : 0 }
  }).filter((item) => item.amountCents > 0)
    .sort((a, b) => b.amountCents - a.amountCents || a.category.name.localeCompare(b.category.name, 'pt-BR'))
}

async function request<T>(operation: () => Promise<T>, options: FinanceRequestOptions): Promise<FinanceResult<T>> {
  try {
    options.signal?.throwIfAborted()
    if (options.simulateFailure) return { ok: false, error: { code: 'unavailable', message: 'Não foi possível carregar os indicadores.' } }
    return { ok: true, data: await operation() }
  } catch (error) {
    if (options.signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      return { ok: false, error: { code: 'cancelled', message: 'Operação cancelada.' } }
    }
    if (error instanceof ApiError) return { ok: false, error: {
      code: error.status === 400 ? 'validation' : 'unavailable', message: error.message,
    } }
    return { ok: false, error: { code: 'unavailable', message: 'Não foi possível carregar os indicadores. Tente novamente.' } }
  }
}

function endOfMonth(period: string) {
  const date = new Date(`${period}-01T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + 1)
  date.setUTCDate(0)
  return date.toISOString().slice(0, 10)
}

export function createApiReportService() {
  return {
    getDashboard(_scope: string, period: string, options: FinanceRequestOptions = {}): Promise<FinanceResult<DashboardSnapshot>> {
      if (!isApiPeriod(period)) return Promise.resolve({ ok: false, error: { code: 'validation', message: 'Informe um período entre 1900 e 9998.' } })
      return request(async () => {
        const [year, month] = period.split('-')
        const params = new URLSearchParams({ year, month: String(Number(month)), limit: '6', page: '1' })
        const [body, categoryBody] = await Promise.all([
          api<unknown>(`/transactions?${params}`, { signal: options.signal }),
          api<unknown>('/categories', { signal: options.signal }),
        ])
        const response = dashboardSchema.parse(body)
        const categories = categoriesSchema.parse(categoryBody).data.map(categoryFromApi)
        const recentTransactions = response.data.map((row) => {
          const item = transactionFromApi(row)
          const category = categories.find((category) => category.id === item.categoryId && category.type === item.type)
          if (!category) throw new Error('Categoria da transação indisponível.')
          return { ...item, category }
        })
        return {
          period, categories, recentTransactions,
          availablePeriods: [...new Set([period, currentFinancialPeriod(), ...response.metadata.available_periods.filter(isApiPeriod)])].sort().reverse(),
          summary: summaryFromApi(response.summary), transactionCount: response.summary.transaction_count,
          expensesByCategory: distribution(response.summary, categories),
        }
      }, options)
    },

    getReport(_scope: string, query: ReportQuery, options: FinanceRequestOptions = {}): Promise<FinanceResult<ReportSnapshot>> {
      const parsed = reportQuerySchema.safeParse(query)
      if (!parsed.success || !isApiPeriod(parsed.data.period)) return Promise.resolve({ ok: false, error: { code: 'validation', message: 'Informe um intervalo e período válidos entre 1900 e 9998.' } })
      return request(async () => {
        const periods = reportPeriods(parsed.data)
        const start = periods.start < '1900-01' ? '1900-01' : periods.start
        const chart = periods.chart.filter((period) => period >= '1900-01')
        const params = new URLSearchParams({ start_date: `${start}-01`, end_date: endOfMonth(periods.end) })
        const chartParams = new URLSearchParams({ start_date: `${chart[0]}-01`, end_date: endOfMonth(periods.end) })
        const [body, monthlyBody, categoryBody] = await Promise.all([
          api<unknown>(`/reports/categories?${params}`, { signal: options.signal }),
          api<unknown>(`/reports/monthly?${chartParams}`, { signal: options.signal }),
          api<unknown>('/categories', { signal: options.signal }),
        ])
        const response = z.object({ data: reportSchema }).parse(body).data
        const categories = categoriesSchema.parse(categoryBody).data.map(categoryFromApi)
        const months = monthlySchema.parse(monthlyBody).data.months.map((row) => ({
          period: `${String(row.year).padStart(4, '0')}-${String(row.month).padStart(2, '0')}`,
          incomeCents: centsFromApi(row.paid_income), expenseCents: centsFromApi(row.paid_expense),
          balanceCents: centsFromApi(row.net), transactionCount: row.transaction_count,
        }))
        if (months.length !== chart.length || months.some((month, index) => month.period !== chart[index])) {
          throw new Error('A série mensal não corresponde ao intervalo solicitado.')
        }
        const summary = summaryFromApi(response)
        return {
          query: parsed.data, startPeriod: start, endPeriod: periods.end, summary,
          transactionCount: response.transaction_count, months,
          resultRate: summary.incomeCents > 0 ? summary.balanceCents / summary.incomeCents : null,
          expensesByCategory: distribution(response, categories),
        }
      }, options)
    },
  }
}

export const apiReportService = createApiReportService()
