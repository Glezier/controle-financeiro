import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiCategoryService } from '../src/services/apiCategoryService'

const id = '9a5a9abc-982b-4d7d-8e36-99e37d4b369f'
const row = { id, name: 'Educação', type: 'expense', icon: 'school' }
const input = { name: '  Educação  ', type: 'expense', icon: 'school' } as const
const fetchMock = vi.fn<typeof fetch>()
const service = createApiCategoryService()

function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(
    status === 204 ? null : JSON.stringify(body),
    { status, headers: { 'Content-Type': 'application/json' } },
  ))
}

describe('categories over authenticated HTTP', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    const storage = new Map([
      ['controle-financeiro.session.v1', JSON.stringify({ access_token: 'access-test', refresh_token: 'refresh-test' })],
    ])
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    })
    vi.stubGlobal('window', new EventTarget())
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('uses the authenticated endpoint and server link counts without requesting transactions', async () => {
    respond({ data: [{ ...row, transaction_count: 125 }] })
    const result = await service.getCategories('not-an-authorization-key')
    expect(result).toMatchObject({
      ok: true,
      data: { total: 1, expenseCount: 1, incomeCount: 0, items: [{ id, apiIcon: 'school', transactionCount: 125 }] },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/categories$/)
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer access-test')
    expect(String(url)).not.toContain('not-an-authorization-key')
  })

  it('writes only supported fields, trims the name and preserves the exact backend icon', async () => {
    respond({ data: row }, 201)
    const result = await service.createCategory('scope', {
      ...input, user_id: 'untrusted', description: 'not persisted', color: 'red',
    } as typeof input)
    expect(result).toMatchObject({ ok: true, data: { id, apiIcon: 'school' } })
    const [, init] = fetchMock.mock.calls[0]
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ name: 'Educação', type: 'expense', icon: 'school' })
  })

  it('patches the existing category without replacing its identity', async () => {
    respond({ data: { ...row, name: 'Estudos' } })
    expect(await service.updateCategory('scope', id, { ...input, name: 'Estudos' }))
      .toMatchObject({ ok: true, data: { id, name: 'Estudos' } })
    expect(fetchMock.mock.calls[0][0]).toMatch(new RegExp(`/categories/${id}$`))
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PATCH')
  })

  it('handles 204 deletion without attempting to decode JSON', async () => {
    respond(null, 204)
    expect(await service.deleteCategory('scope', id)).toEqual({ ok: true, data: null })
    expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE')
  })

  it.each([
    ['DUPLICATE_CATEGORY', 409, 'duplicate'],
    ['CATEGORY_CONFLICT', 409, 'in_use'],
    ['NOT_FOUND', 404, 'not_found'],
  ])('maps %s to actionable form/dialog errors', async (code, status, expected) => {
    respond({ error: { code, message: 'Mensagem do servidor' } }, status)
    expect(await service.updateCategory('scope', id, input))
      .toMatchObject({ ok: false, error: { code: expected, message: 'Mensagem do servidor' } })
  })

  it('returns field validation errors from the API', async () => {
    respond({ error: { code: 'VALIDATION_ERROR', message: 'Revise os dados.', issues: [{ path: 'name', message: 'Nome inválido.' }] } }, 400)
    expect(await service.createCategory('scope', input))
      .toMatchObject({ ok: false, error: { code: 'validation', fields: { name: 'Nome inválido.' } } })
  })

  it('does not send cancelled operations or invalid identifiers', async () => {
    const controller = new AbortController()
    controller.abort()
    expect(await service.createCategory('scope', input, { signal: controller.signal }))
      .toMatchObject({ ok: false, error: { code: 'cancelled' } })
    expect(await service.deleteCategory('scope', '../auth/logout'))
      .toMatchObject({ ok: false, error: { code: 'validation' } })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects malformed responses instead of displaying a false empty or unused state', async () => {
    respond({ data: [row] })
    expect(await service.getCategories('scope'))
      .toMatchObject({ ok: false, error: { code: 'unavailable' } })
  })
})
