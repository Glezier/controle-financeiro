import type { CategoryExpense, DashboardSummary } from './finance'

export type ReportRange = 'month' | 'quarter' | 'year'
export interface ReportQuery {
  period: string
  range: ReportRange
}
export interface MonthlyReport {
  period: string
  incomeCents: number
  expenseCents: number
  balanceCents: number
  transactionCount: number
}
export interface ReportSnapshot {
  query: ReportQuery
  startPeriod: string
  endPeriod: string
  summary: DashboardSummary
  transactionCount: number
  resultRate: number | null
  months: MonthlyReport[]
  expensesByCategory: CategoryExpense[]
}
