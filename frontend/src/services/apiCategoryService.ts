import { z } from 'zod'
import type {
  Category, CategorySnapshot, FinanceRequestOptions, FinanceResult,
} from '../types/finance'
import {
  apiCategoryInputSchema, apiCategorySchema, categoryFromApi,
} from '../utils/apiCategory'
import type { ApiCategoryInput } from '../utils/apiCategory'
import { categoryFieldErrors } from '../utils/categoryValidation'
import { api, ApiError } from './api'

const listSchema = z.object({
  data: z.array(apiCategorySchema.extend({ transaction_count: z.number().int().nonnegative() })),
})
const itemSchema = z.object({ data: apiCategorySchema })

async function request<T>(
  operation: () => Promise<T>,
  options: FinanceRequestOptions,
): Promise<FinanceResult<T>> {
  try {
    options.signal?.throwIfAborted()
    if (options.simulateFailure) {
      return { ok: false, error: { code: 'unavailable', message: 'Não foi possível carregar as categorias.' } }
    }
    return { ok: true, data: await operation() }
  } catch (error) {
    if (options.signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      return { ok: false, error: { code: 'cancelled', message: 'Operação cancelada.' } }
    }
    if (error instanceof ApiError) {
      const code = error.code === 'DUPLICATE_CATEGORY' ? 'duplicate'
        : error.code === 'CATEGORY_CONFLICT' ? 'in_use'
        : error.status === 404 ? 'not_found'
        : error.status === 400 ? 'validation' : 'unavailable'
      return {
        ok: false,
        error: {
          code,
          message: error.message,
          fields: code === 'duplicate'
            ? { name: 'Já existe uma categoria com esse nome e tipo.' } : error.fields,
        },
      }
    }
    return {
      ok: false,
      error: { code: 'unavailable', message: 'Não foi possível acessar as categorias. Tente novamente.' },
    }
  }
}

// O scope mantém compatibilidade com os hooks. A autorização vem apenas do token.
export function createApiCategoryService() {
  async function save(
    path: string,
    method: 'POST' | 'PATCH',
    input: ApiCategoryInput,
    options: FinanceRequestOptions,
  ): Promise<FinanceResult<Category>> {
    const parsed = apiCategoryInputSchema.safeParse(input)
    if (!parsed.success) {
      return {
        ok: false,
        error: { code: 'validation', message: 'Revise os campos informados.', fields: categoryFieldErrors(parsed.error.issues) },
      }
    }
    return request(async () => {
      const response = itemSchema.parse(await api<unknown>(path, {
        method, body: JSON.stringify(parsed.data), signal: options.signal,
      }))
      return categoryFromApi(response.data)
    }, options)
  }

  return {
    getCategories(_scope: string, options: FinanceRequestOptions = {}): Promise<FinanceResult<CategorySnapshot>> {
      return request(async () => {
        const response = listSchema.parse(await api<unknown>('/categories', { signal: options.signal }))
        const items = response.data.map((row) => ({
          ...categoryFromApi(row), transactionCount: row.transaction_count,
        })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id))
        return {
          items,
          total: items.length,
          incomeCount: items.filter((item) => item.type === 'income').length,
          expenseCount: items.filter((item) => item.type === 'expense').length,
        }
      }, options)
    },
    createCategory(_scope: string, input: ApiCategoryInput, options: FinanceRequestOptions = {}) {
      return save('/categories', 'POST', input, options)
    },
    updateCategory(_scope: string, id: string, input: ApiCategoryInput, options: FinanceRequestOptions = {}): Promise<FinanceResult<Category>> {
      if (!z.uuid().safeParse(id).success) {
        return Promise.resolve({ ok: false, error: { code: 'validation', message: 'Identificador de categoria inválido.' } })
      }
      return save(`/categories/${id}`, 'PATCH', input, options)
    },
    deleteCategory(_scope: string, id: string, options: FinanceRequestOptions = {}): Promise<FinanceResult<null>> {
      if (!z.uuid().safeParse(id).success) {
        return Promise.resolve({ ok: false, error: { code: 'validation', message: 'Identificador de categoria inválido.' } })
      }
      return request(async () => {
        await api(`/categories/${id}`, { method: 'DELETE', signal: options.signal })
        return null
      }, options)
    },
  }
}
