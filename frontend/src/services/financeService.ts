import { createMockFinance } from '../mocks/finance'
import type {
  DashboardSnapshot,
  FinanceAdapter,
  FinanceRequestOptions,
  FinanceResult,
  Transaction,
  TransactionDraft,
} from '../types/finance'
import { summarizeDashboard } from '../utils/dashboardSummary'
import { isFinancialPeriod, parseBrlAmount } from '../utils/financeFormat'
import { transactionFieldErrors, transactionSchema } from '../utils/transactionValidation'

export { financeDemoPeriod } from '../mocks/finance'

async function waitForMock(signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve) => {
    if (signal?.aborted) {
      resolve()
      return
    }
    const finish = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', finish)
      resolve()
    }
    const timer = setTimeout(finish, 450)
    signal?.addEventListener('abort', finish, { once: true })
  })
}

export function createFinanceService(adapter: FinanceAdapter = createMockFinance()) {
  async function request<T>(
    operation: () => Promise<FinanceResult<T>>,
    options: FinanceRequestOptions,
  ): Promise<FinanceResult<T>> {
    await waitForMock(options.signal)
    if (options.signal?.aborted)
      return { ok: false, error: { code: 'cancelled', message: 'Operação cancelada.' } }
    if (options.simulateFailure)
      return {
        ok: false,
        error: {
          code: 'unavailable',
          message: 'Falha de demonstração ao carregar os dados. Tente novamente.',
        },
      }
    try {
      return await operation()
    } catch {
      return {
        ok: false,
        error: {
          code: 'unavailable',
          message: 'Não foi possível concluir a operação. Tente novamente.',
        },
      }
    }
  }
  return {
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
              fields: {
                categoryId: 'A categoria deve pertencer ao usuário e ao tipo selecionado.',
              },
            },
          }
        const amountCents = parseBrlAmount(amount)
        if (amountCents === null)
          return { ok: false, error: { code: 'validation', message: 'Valor inválido.' } }
        if (options.signal?.aborted)
          return { ok: false, error: { code: 'cancelled', message: 'Operação cancelada.' } }
        return {
          ok: true,
          data: await adapter.createTransaction(scope, { ...values, amountCents }),
        }
      }, options)
    },
  }
}

export const financeService = createFinanceService()
