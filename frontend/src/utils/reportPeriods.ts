import { z } from 'zod'
import type { ReportQuery } from '../types/reports'
import { formatPeriod, isFinancialPeriod } from './financeFormat'

export const reportQuerySchema = z.object({
  period: z.string().refine(isFinancialPeriod),
  range: z.enum(['month', 'quarter', 'year']),
})
export function readReportQuery(params: URLSearchParams, defaultPeriod: string): ReportQuery {
  const period = params.get('period') ?? defaultPeriod
  const range = params.get('range')
  return {
    period: isFinancialPeriod(period) ? period : defaultPeriod,
    range: range === 'quarter' || range === 'year' ? range : 'month',
  }
}
export function writeReportQuery(query: ReportQuery): URLSearchParams {
  return new URLSearchParams({ period: query.period, range: query.range })
}
function monthIndex(period: string): number {
  const [year, month] = period.split('-').map(Number)
  return (year - 1) * 12 + month - 1
}
function periodAt(index: number): string {
  return `${String(Math.floor(index / 12) + 1).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`
}
export function reportPeriods(query: ReportQuery): { start: string; end: string; chart: string[] } {
  const anchor = monthIndex(query.period)
  const start =
    query.range === 'year'
      ? Math.floor(anchor / 12) * 12
      : query.range === 'quarter'
        ? Math.max(0, anchor - 2)
        : anchor
  const end = query.range === 'year' ? start + 11 : anchor
  // A monthly report includes four months of chart context; its totals remain the selected month.
  const chartStart = query.range === 'month' ? Math.max(0, anchor - 3) : start
  return {
    start: periodAt(start),
    end: periodAt(end),
    chart: Array.from({ length: end - chartStart + 1 }, (_, index) => periodAt(chartStart + index)),
  }
}
export function reportPeriodLabel(start: string, end: string): string {
  return start === end ? formatPeriod(start) : `${formatPeriod(start)} a ${formatPeriod(end)}`
}
