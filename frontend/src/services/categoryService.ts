import { z } from 'zod'
import { createMockFinance, mockFinanceAdapter } from '../mocks/finance'
import type {
  Category,
  CategoryDraft,
  CategorySnapshot,
  CategoryValues,
  CategoryWriteResult,
  FinanceAdapter,
  FinanceRequestOptions,
  FinanceResult,
} from '../types/finance'
import { categoryFieldErrors, categorySchema } from '../utils/categoryValidation'
import { financeRequest } from './financeRequest'

function mutationResult<T>(result: CategoryWriteResult<T>): FinanceResult<T> {
  if (result.ok) return result
  const errors = {
    not_found: {
      code: 'not_found',
      message: 'A categoria não está mais disponível. Atualize a listagem.',
    },
    in_use: {
      code: 'in_use',
      message:
        'Categoria em uso. Não é possível excluir nem alterar o tipo enquanto houver transações vinculadas.',
    },
    duplicate: {
      code: 'duplicate',
      message: 'Já existe uma categoria com este nome e tipo.',
      fields: { name: 'Use outro nome para este tipo de categoria.' },
    },
  } as const
  return { ok: false, error: errors[result.reason] }
}

export function createCategoryService(adapter: FinanceAdapter = createMockFinance()) {
  async function save(
    scope: string,
    input: CategoryDraft,
    operation: (values: CategoryValues) => Promise<CategoryWriteResult<Category>>,
    options: FinanceRequestOptions,
  ): Promise<FinanceResult<Category>> {
    const parsed = categorySchema.safeParse(input)
    if (!scope.trim())
      return {
        ok: false,
        error: { code: 'validation', message: 'Usuário de demonstração inválido.' },
      }
    if (!parsed.success)
      return {
        ok: false,
        error: {
          code: 'validation',
          message: 'Revise os campos informados.',
          fields: categoryFieldErrors(parsed.error.issues),
        },
      }
    const { name, type, description, color, icon } = parsed.data
    return financeRequest(
      async () =>
        mutationResult(await operation({ name, type, appearance: { description, color, icon } })),
      options,
    )
  }
  return {
    async getCategories(
      scope: string,
      options: FinanceRequestOptions = {},
    ): Promise<FinanceResult<CategorySnapshot>> {
      if (!scope.trim())
        return {
          ok: false,
          error: { code: 'validation', message: 'Usuário de demonstração inválido.' },
        }
      return financeRequest(async () => {
        const [categories, transactions] = await Promise.all([
          adapter.listCategories(scope),
          adapter.listTransactions(scope),
        ])
        const items = categories
          .map((category) => ({
            ...category,
            transactionCount: transactions.filter((item) => item.categoryId === category.id).length,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id))
        return {
          ok: true,
          data: {
            items,
            total: items.length,
            incomeCount: items.filter((item) => item.type === 'income').length,
            expenseCount: items.filter((item) => item.type === 'expense').length,
          },
        }
      }, options)
    },
    createCategory(scope: string, input: CategoryDraft, options: FinanceRequestOptions = {}) {
      return save(scope, input, (values) => adapter.createCategory(scope, values), options)
    },
    async updateCategory(
      scope: string,
      id: string,
      input: CategoryDraft,
      options: FinanceRequestOptions = {},
    ): Promise<FinanceResult<Category>> {
      if (!z.uuid().safeParse(id).success)
        return {
          ok: false,
          error: { code: 'validation', message: 'Identificador de categoria inválido.' },
        }
      return save(scope, input, (values) => adapter.updateCategory(scope, id, values), options)
    },
    async deleteCategory(
      scope: string,
      id: string,
      options: FinanceRequestOptions = {},
    ): Promise<FinanceResult<null>> {
      if (!scope.trim() || !z.uuid().safeParse(id).success)
        return {
          ok: false,
          error: { code: 'validation', message: 'Identificador de categoria ou usuário inválido.' },
        }
      return financeRequest(
        async () => mutationResult(await adapter.deleteCategory(scope, id)),
        options,
      )
    },
  }
}

export const categoryService = createCategoryService(mockFinanceAdapter)
