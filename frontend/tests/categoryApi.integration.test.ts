import { expect, it, vi } from 'vitest'

const url = process.env.CATEGORY_API_INTEGRATION_URL

it.skipIf(!url)('persists category CRUD and enforces ownership through the local API and database', async () => {
  const target = new URL(url!)
  if (!['localhost', '127.0.0.1'].includes(target.hostname)) throw new Error('Use apenas a demonstração local temporária.')
  const health = await fetch(`${target.origin}/health`)
  expect(health.headers.get('X-Local-Demo')).toBe('true')

  const storage = new Map<string, string>()
  vi.stubEnv('VITE_API_URL', url!)
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  })
  vi.stubGlobal('window', new EventTarget())
  vi.resetModules()
  try {
    const { api, saveSession } = await import('../src/services/api')
    const { createApiCategoryService } = await import('../src/services/apiCategoryService')
    const service = createApiCategoryService()
    async function login(email: string) {
      const response = await api<{ data: { session: { access_token: string; refresh_token: string } } }>(
        '/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'Demo12345!' }) }, false,
      )
      saveSession(response.data.session)
    }
    await login('demo@local.test')
    const input = { name: `Integração ${crypto.randomUUID()}`, type: 'expense', icon: 'school' } as const
    const created = await service.createCategory('ignored', input)
    expect(created.ok).toBe(true)
    if (!created.ok) throw new Error(created.error.message)
    const id = created.data.id
    try {
      const listed = await service.getCategories('ignored')
      expect(listed.ok && listed.data.items.find((item) => item.id === id))
        .toMatchObject({ apiIcon: 'school', transactionCount: 0 })
      expect(await service.createCategory('ignored', input)).toMatchObject({ ok: false, error: { code: 'duplicate' } })
      const changed = await service.updateCategory('ignored', id, { ...input, name: `${input.name} editada`, icon: 'work' })
      expect(changed).toMatchObject({ ok: true, data: { id, apiIcon: 'work' } })

      await login('outro@local.test')
      const other = await service.getCategories('ignored')
      expect(other.ok && other.data.items.some((item) => item.id === id)).toBe(false)
      expect(await service.updateCategory('ignored', id, input)).toMatchObject({ ok: false, error: { code: 'not_found' } })
      expect(await service.deleteCategory('ignored', id)).toMatchObject({ ok: false, error: { code: 'not_found' } })

      await login('demo@local.test')
      const reloaded = await createApiCategoryService().getCategories('ignored')
      expect(reloaded.ok && reloaded.data.items.find((item) => item.id === id))
        .toMatchObject({ name: `${input.name} editada`, apiIcon: 'work' })
      const used = reloaded.ok ? reloaded.data.items.find((item) => item.transactionCount > 0) : undefined
      expect(used).toBeDefined()
      expect(await service.deleteCategory('ignored', used!.id)).toMatchObject({ ok: false, error: { code: 'in_use' } })
      expect(await service.updateCategory('ignored', used!.id, { name: used!.name, type: used!.type === 'expense' ? 'income' : 'expense', icon: 'home' }))
        .toMatchObject({ ok: false, error: { code: 'in_use' } })
    } finally {
      await login('demo@local.test')
      expect(await service.deleteCategory('ignored', id)).toEqual({ ok: true, data: null })
    }
    const final = await service.getCategories('ignored')
    expect(final.ok && final.data.items.some((item) => item.id === id)).toBe(false)
  } finally {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
  }
}, 30_000)
