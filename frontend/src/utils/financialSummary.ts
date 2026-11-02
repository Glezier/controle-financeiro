import type { Category, CategoryExpense, DashboardSummary, Transaction } from '../types/finance'
import { isFinancialPeriod } from './financeFormat'

export function summarizeTransactions(transactions: Transaction[]): DashboardSummary {
  const income = transactions.filter((item) => item.type === 'income' && item.status === 'paid')
  const expenses = transactions.filter((item) => item.type === 'expense' && item.status === 'paid')
  const pending = transactions.filter((item) => item.status === 'pending')
  const sum = (items: Transaction[]) => items.reduce((total, item) => total + item.amountCents, 0)
  const incomeCents = sum(income)
  const expenseCents = sum(expenses)
  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    paidIncomeCount: income.length,
    paidExpenseCount: expenses.length,
    pendingIncomeCents: sum(pending.filter((item) => item.type === 'income')),
    pendingExpenseCents: sum(pending.filter((item) => item.type === 'expense')),
    pendingCount: pending.length,
    nextPendingDate: pending.map((item) => item.date).sort()[0] ?? null,
  }
}

export function availableFinancialPeriods(transactions: Transaction[], selected: string): string[] {
  return Array.from(
    new Set([
      '2024-10',
      '2024-09',
      '2024-08',
      ...(isFinancialPeriod(selected) ? [selected] : []),
      ...transactions.map((item) => item.date.slice(0, 7)),
    ]),
  )
    .sort()
    .reverse()
}

export function summarizeExpenses(
  categories: Category[],
  transactions: Transaction[],
): CategoryExpense[] {
  const sum = (items: Transaction[]) => items.reduce((total, item) => total + item.amountCents, 0)
  const expenseCents = summarizeTransactions(transactions).expenseCents
  return categories
    .filter((item) => item.type === 'expense')
    .map((category) => {
      const amountCents = sum(
        transactions.filter(
          (item) =>
            item.categoryId === category.id && item.type === 'expense' && item.status === 'paid',
        ),
      )
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
}
