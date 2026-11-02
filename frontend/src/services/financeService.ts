import { financeRequest as request } from './financeRequest'
import { transactionService } from './apiTransactionService'
import { createMockFinance, mockFinanceAdapter } from '../mocks/finance'
import { z } from 'zod'
import type {
  DashboardSnapshot,
  FinanceAdapter,
  FinanceRequestOptions,
  FinanceResult,
  Transaction,
  TransactionDraft,
  NewTransaction,
  TransactionQuery,
  TransactionListSnapshot,
} from '../types/finance'
import { summarizeDashboard } from '../utils/dashboardSummary'
import { isFinancialPeriod, parseBrlAmount } from '../utils/financeFormat'
import { transactionFieldErrors, transactionSchema } from '../utils/transactionValidation'
import { selectTransactions, transactionQuerySchema } from '../utils/transactionQuery'

export { financeDemoPeriod } from '../mocks/finance'

export function createFinanceService(adapter: FinanceAdapter = createMockFinance()) {
  const missing = (): FinanceResult<never> => ({
    ok: false,
    error: {
      code: 'not_found',
      message: 'A transação não está mais disponível. Atualize a listagem.',
    },
  })
  async function saveTransaction(
    scope: string,
    input: TransactionDraft,
    operation: (values: NewTransaction) => Promise<Transaction | null>,
    options: FinanceRequestOptions,
  ): Promise<FinanceResult<Transaction>> {
    const parsed = transactionSchema.safeParse(input)
    if (!parsed.success)
      return {
        ok: false,
        error: {
          code: 'validation',
          message: 'Revise os campos informados.',
          fields: transactionFieldErrors(parsed.error.issues),
        },
      }
    if (!scope.trim())
      return {
        ok: false,
        error: { code: 'validation', message: 'Usuário de demonstração inválido.' },
      }
    return request(async () => {
      const { amount, ...values } = parsed.data
      const categories = await adapter.listCategories(scope)
      if (!categories.some((item) => item.id === values.categoryId && item.type === values.type))
        return {
          ok: false,
          error: {
            code: 'validation',
            message: 'Selecione uma categoria compatível.',
            fields: { categoryId: 'A categoria deve pertencer ao usuário e ao tipo selecionado.' },
          },
        }
      const amountCents = parseBrlAmount(amount)
      if (amountCents === null)
        return { ok: false, error: { code: 'validation', message: 'Valor inválido.' } }
      if (options.signal?.aborted)
        return { ok: false, error: { code: 'cancelled', message: 'Operação cancelada.' } }
      const transaction = await operation({ ...values, amountCents })
      return transaction ? { ok: true, data: transaction } : missing()
    }, options)
  }

  return {
    async getTransactions(
      scope: string,
      query: TransactionQuery,
      options: FinanceRequestOptions = {},
    ): Promise<FinanceResult<TransactionListSnapshot>> {
      const parsed = transactionQuerySchema.safeParse(query)
      if (!scope.trim() || !parsed.success)
        return {
          ok: false,
          error: {
            code: 'validation',
            message: 'Informe um usuário de demonstração e filtros válidos.',
          },
        }
      return request(async () => {
        const [categories, transactions] = await Promise.all([
          adapter.listCategories(scope),
          adapter.listTransactions(scope),
        ])
        return { ok: true, data: selectTransactions(categories, transactions, parsed.data) }
      }, options)
    },
    async getDashboard(
      scope: string,
      period: string,
      options: FinanceRequestOptions = {},
    ): Promise<FinanceResult<DashboardSnapshot>> {
      if (!scope.trim() || !isFinancialPeriod(period))
        return {
          ok: false,
          error: {
            code: 'validation',
            message: 'Informe um usuário de demonstração e um período válido.',
          },
        }
      return request(async () => {
        const [categories, transactions] = await Promise.all([
          adapter.listCategories(scope),
          adapter.listTransactions(scope),
        ])
        return { ok: true, data: summarizeDashboard(categories, transactions, period) }
      }, options)
    },
    async createTransaction(
      scope: string,
      input: TransactionDraft,
      options: FinanceRequestOptions = {},
    ): Promise<FinanceResult<Transaction>> {
      return saveTransaction(
        scope,
        input,
        (values) => adapter.createTransaction(scope, values),
        options,
      )
    },
    async updateTransaction(
      scope: string,
      id: string,
      input: TransactionDraft,
      options: FinanceRequestOptions = {},
    ): Promise<FinanceResult<Transaction>> {
      if (!z.uuid().safeParse(id).success)
        return {
          ok: false,
          error: { code: 'validation', message: 'Identificador de transação inválido.' },
        }
      return saveTransaction(
        scope,
        input,
        (values) => adapter.updateTransaction(scope, id, values),
        options,
      )
    },
    async deleteTransaction(
      scope: string,
      id: string,
      options: FinanceRequestOptions = {},
    ): Promise<FinanceResult<null>> {
      if (!scope.trim() || !z.uuid().safeParse(id).success)
        return {
          ok: false,
          error: { code: 'validation', message: 'Identificador de transação ou usuário inválido.' },
        }
      return request(
        async () =>
          (await adapter.deleteTransaction(scope, id)) ? { ok: true, data: null } : missing(),
        options,
      )
    },
  }
}

export const financeService = {
  ...createFinanceService(mockFinanceAdapter),
  ...transactionService,
}
