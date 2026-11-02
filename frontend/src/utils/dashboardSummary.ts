import type { Category, DashboardSnapshot, Transaction, TransactionView } from '../types/finance'
import {
  availableFinancialPeriods,
  summarizeTransactions,
  summarizeExpenses,
} from './financialSummary'

export function summarizeDashboard(
  categories: Category[],
  transactions: Transaction[],
  period: string,
): DashboardSnapshot {
  const filtered: TransactionView[] = transactions
    .filter((item) => item.date.startsWith(`${period}-`))
    .map((item) => {
      const category = categories.find(
        (candidate) => candidate.id === item.categoryId && candidate.type === item.type,
      )
      if (!category) throw new Error('Transaction category is missing or inconsistent')
      return { ...item, category }
    })
  const summary = summarizeTransactions(filtered)
  const expensesByCategory = summarizeExpenses(categories, filtered)

  return structuredClone({
    period,
    availablePeriods: availableFinancialPeriods(transactions, period),
    categories,
    summary,
    recentTransactions: [...filtered]
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.createdAt.localeCompare(a.createdAt) ||
          a.id.localeCompare(b.id),
      )
      .slice(0, 6),
    expensesByCategory,
    transactionCount: filtered.length,
  })
}
