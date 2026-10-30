import type { Category, DashboardSnapshot, Transaction, TransactionView } from '../types/finance'

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
  const paidIncome = filtered.filter((item) => item.type === 'income' && item.status === 'paid')
  const paidExpenses = filtered.filter((item) => item.type === 'expense' && item.status === 'paid')
  const pending = filtered.filter((item) => item.status === 'pending')
  const sum = (items: Transaction[]) => items.reduce((total, item) => total + item.amountCents, 0)
  const incomeCents = sum(paidIncome)
  const expenseCents = sum(paidExpenses)
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
    availablePeriods: Array.from(
      new Set([
        '2024-10',
        '2024-09',
        '2024-08',
        period,
        ...transactions.map((item) => item.date.slice(0, 7)),
      ]),
    )
      .sort()
      .reverse(),
    categories,
    summary: {
      incomeCents,
      expenseCents,
      balanceCents: incomeCents - expenseCents,
      paidIncomeCount: paidIncome.length,
      paidExpenseCount: paidExpenses.length,
      pendingIncomeCents: sum(pending.filter((item) => item.type === 'income')),
      pendingExpenseCents: sum(pending.filter((item) => item.type === 'expense')),
      pendingCount: pending.length,
      nextPendingDate: pending.map((item) => item.date).sort()[0] ?? null,
    },
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
