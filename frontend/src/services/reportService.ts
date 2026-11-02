import { createMockFinance } from '../mocks/finance'
import type { FinanceAdapter, FinanceRequestOptions, FinanceResult } from '../types/finance'
import type { ReportQuery, ReportSnapshot } from '../types/reports'
import { reportQuerySchema } from '../utils/reportPeriods'
import { summarizeReport } from '../utils/reportSummary'
import { financeRequest } from './financeRequest'
import { apiReportService } from './apiReportService'

export function createReportService(adapter: FinanceAdapter = createMockFinance()) {
  return {
    async getReport(
      scope: string,
      query: ReportQuery,
      options: FinanceRequestOptions = {},
    ): Promise<FinanceResult<ReportSnapshot>> {
      const parsed = reportQuerySchema.safeParse(query)
      if (!scope.trim() || !parsed.success)
        return {
          ok: false,
          error: {
            code: 'validation',
            message: 'Informe um usuário de demonstração e um período válido.',
          },
        }
      return financeRequest(async () => {
        const [categories, transactions] = await Promise.all([
          adapter.listCategories(scope),
          adapter.listTransactions(scope),
        ])
        return { ok: true, data: summarizeReport(categories, transactions, parsed.data) }
      }, options)
    },
  }
}
export const reportService = { getReport: apiReportService.getReport }
