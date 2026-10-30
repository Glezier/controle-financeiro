import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthService, demoAccess } from '../src/services/authService'
import { createMockAuth } from '../src/mocks/auth'

const registration = {
  name: 'Ana Silva',
  email: 'ana@example.com',
  password: 'senha-demo-123',
  confirmPassword: 'senha-demo-123',
  acceptedDemo: true,
}
async function settle<T>(pending: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync()
  return pending
}

describe('simulated authentication service', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts anonymous and exposes only a public profile after login', async () => {
    const service = createAuthService()
    expect(await settle(service.getSession())).toEqual({ ok: true, data: null })
    const result = await settle(service.signIn(demoAccess))
    expect(result).toEqual({ ok: true, data: { name: 'Lucas Mendes', email: demoAccess.email } })
    expect(JSON.stringify(result)).not.toContain(demoAccess.password)
    if (result.ok) result.data.name = 'Changed externally'
    expect(await settle(service.getSession())).toEqual({
      ok: true,
      data: { name: 'Lucas Mendes', email: demoAccess.email },
    })
  })
  it('rejects wrong passwords and unknown accounts without creating a session', async () => {
    const service = createAuthService()
    for (const input of [
      { ...demoAccess, password: 'wrong-password' },
      { ...demoAccess, email: 'unknown@example.com' },
    ]) {
      expect(await settle(service.signIn(input))).toMatchObject({
        ok: false,
        error: { code: 'invalid_credentials' },
      })
    }
    expect(await settle(service.getSession())).toEqual({ ok: true, data: null })
  })
  it('registers, authenticates and signs out in the same runtime', async () => {
    const service = createAuthService()
    expect(await settle(service.signUp({ ...registration, email: ' ANA@EXAMPLE.COM ' }))).toEqual({
      ok: true,
      data: { name: registration.name, email: registration.email },
    })
    expect(await settle(service.getSession())).toEqual({ ok: true, data: null })
    expect(await settle(service.signIn(registration))).toMatchObject({
      ok: true,
      data: { name: registration.name },
    })
    expect(await settle(service.signOut())).toEqual({ ok: true, data: null })
    expect(await settle(service.getSession())).toEqual({ ok: true, data: null })
  })
  it('does not overwrite an existing account, including concurrent registrations', async () => {
    const service = createAuthService()
    const pending = Promise.all([
      service.signUp(registration),
      service.signUp({ ...registration, name: 'Other name' }),
    ])
    const results = await settle(pending)
    expect(results.filter((result) => result.ok)).toHaveLength(1)
    expect(results.find((result) => !result.ok)).toMatchObject({
      ok: false,
      error: { code: 'email_exists' },
    })
  })
  it('validates before invoking the adapter', async () => {
    const adapter = createMockAuth()
    const signIn = vi.spyOn(adapter, 'signIn')
    const service = createAuthService(adapter)
    expect(await service.signIn({ email: 'bad', password: '' })).toMatchObject({
      ok: false,
      error: { code: 'validation' },
    })
    expect(signIn).not.toHaveBeenCalled()
  })
  it('simulates latency and an error without authenticating', async () => {
    const service = createAuthService()
    let resolved = false
    const pending = service.signIn(demoAccess, { simulateFailure: true }).then((value) => {
      resolved = true
      return value
    })
    await vi.advanceTimersByTimeAsync(649)
    expect(resolved).toBe(false)
    expect(await settle(pending)).toMatchObject({ ok: false, error: { code: 'unavailable' } })
    expect(await settle(service.getSession())).toEqual({ ok: true, data: null })
  })
  it('cancels an unmounted form request before invoking the mock', async () => {
    const adapter = createMockAuth()
    const signUp = vi.spyOn(adapter, 'signUp')
    const service = createAuthService(adapter)
    const controller = new AbortController()
    const pending = service.signUp(registration, { signal: controller.signal })
    controller.abort()
    expect(await settle(pending)).toMatchObject({ ok: false, error: { code: 'cancelled' } })
    expect(signUp).not.toHaveBeenCalled()
  })
  it('isolates adapter failures and resets state in a new runtime', async () => {
    const adapter = createMockAuth()
    vi.spyOn(adapter, 'signIn').mockRejectedValue(new Error('internal details'))
    const result = await settle(createAuthService(adapter).signIn(demoAccess))
    expect(result).toMatchObject({ ok: false, error: { code: 'unavailable' } })
    expect(JSON.stringify(result)).not.toContain('internal details')
    expect(await settle(createAuthService().getSession())).toEqual({ ok: true, data: null })
  })
})
