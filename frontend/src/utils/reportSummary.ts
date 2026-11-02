import type { Category, Transaction } from '../types/finance'
import type { ReportQuery, ReportSnapshot } from '../types/reports'
import { summarizeExpenses, summarizeTransactions } from './financialSummary'
import { reportPeriods } from './reportPeriods'

export function summarizeReport(
  categories: Category[],
  transactions: Transaction[],
  query: ReportQuery,
): ReportSnapshot {
  const periods = reportPeriods(query)
  for (const item of transactions)
    if (
      !categories.some((category) => category.id === item.categoryId && category.type === item.type)
    )
      throw new Error('Inconsistent transaction category')
  const selected = transactions.filter((item) => {
    const period = item.date.slice(0, 7)
    return period >= periods.start && period <= periods.end
  })
  const months = periods.chart.map((period) => {
    const items = transactions.filter((item) => item.date.startsWith(`${period}-`))
    const { incomeCents, expenseCents, balanceCents } = summarizeTransactions(items)
    return { period, incomeCents, expenseCents, balanceCents, transactionCount: items.length }
  })
  const summary = summarizeTransactions(selected)
  return structuredClone({
    query,
    startPeriod: periods.start,
    endPeriod: periods.end,
    summary,
    transactionCount: selected.length,
    resultRate: summary.incomeCents > 0 ? summary.balanceCents / summary.incomeCents : null,
    months,
    expensesByCategory: summarizeExpenses(categories, selected),
  })
}
