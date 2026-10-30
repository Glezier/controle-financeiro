import type { Category, DashboardSnapshot, Transaction, TransactionView } from '../types/finance'
import { availableFinancialPeriods, summarizeTransactions } from './financialSummary'

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
  const paidExpenses = filtered.filter((item) => item.type === 'expense' && item.status === 'paid')
  const sum = (items: Transaction[]) => items.reduce((total, item) => total + item.amountCents, 0)
  const summary = summarizeTransactions(filtered)
  const { expenseCents } = summary
  const expensesByCategory = categories
    .filter((item) => item.type === 'expense')
    .map((category) => {
      const amountCents = sum(paidExpenses.filter((item) => item.categoryId === category.id))
      return {
        category,
        amountCents,
        percentage: expenseCents ? (amountCents / expenseCents) * 100 : 0,
      }
    })
    .filter((item) => item.amountCents > 0)
    .sort(
      (a, b) =>
        b.amountCents - a.amountCents || a.category.name.localeCompare(b.category.name, 'pt-BR'),
    )

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
