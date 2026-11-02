import type { AuthAdapter, AuthResult } from '../types/auth'
import type { UserProfile } from '../types/profile'

// Public, fictitious credentials for the demonstration; never real account secrets.
export const demoAccess = { email: 'lucas.mendes@email.com', password: '12345678' }
const cancelled = (): AuthResult<never> => ({
  ok: false,
  error: { code: 'cancelled', message: 'Operação cancelada.' },
})

async function fingerprint(password: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function createMockAuth(): AuthAdapter {
  const accounts = new Map<string, { user: UserProfile; fingerprint: string }>()
  let currentUser: UserProfile | null = null
  const ready = fingerprint(demoAccess.password).then((value) => {
    accounts.set(demoAccess.email, {
      user: { name: 'Lucas Mendes', email: demoAccess.email },
      fingerprint: value,
    })
  })

  return {
    async getSession() {
      return { ok: true, data: currentUser ? { ...currentUser } : null }
    },
    async signIn(input, signal) {
      await ready
      const value = await fingerprint(input.password)
      if (signal?.aborted) return cancelled()
      const account = accounts.get(input.email)
      if (!account || account.fingerprint !== value)
        return {
          ok: false,
          error: {
            code: 'invalid_credentials',
            message: 'E-mail ou senha incorretos. Verifique os dados digitados.',
          },
        }
      currentUser = { ...account.user }
      return { ok: true, data: { ...currentUser } }
    },
    async signUp(input, signal) {
      await ready
      const value = await fingerprint(input.password)
      if (signal?.aborted) return cancelled()
      if (accounts.has(input.email))
        return {
          ok: false,
          error: {
            code: 'email_exists',
            message: 'Este e-mail já está cadastrado nesta demonstração.',
          },
        }
      const user = { name: input.name, email: input.email }
      accounts.set(input.email, { user, fingerprint: value })
      return { ok: true, data: { ...user } }
    },
    async signOut() {
      currentUser = null
      return { ok: true, data: null }
    },
  }
}
