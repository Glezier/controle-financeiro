import { createMockAuth } from '../mocks/auth'
import type {
  AuthAdapter,
  AuthRequestOptions,
  AuthResult,
  LoginInput,
  RegistrationInput,
} from '../types/auth'
import { authFieldErrors, loginSchema, registrationSchema } from '../utils/authValidation'

// Demo-only presentation metadata is provided through the service boundary.
export { demoAccess } from '../mocks/auth'

function pause(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve()
      return
    }
    const finish = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', finish)
      resolve()
    }
    const timer = setTimeout(finish, 650)
    signal?.addEventListener('abort', finish, { once: true })
  })
}

export function createAuthService(adapter: AuthAdapter = createMockAuth()) {
  async function request<T>(
    operation: () => Promise<AuthResult<T>>,
    options: AuthRequestOptions = {},
  ): Promise<AuthResult<T>> {
    await pause(options.signal)
    if (options.signal?.aborted)
      return { ok: false, error: { code: 'cancelled', message: 'Operação cancelada.' } }
    if (options.simulateFailure)
      return {
        ok: false,
        error: {
          code: 'unavailable',
          message: 'Falha de acesso simulada. Tente novamente pelo botão principal.',
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
    getSession: () => request(() => adapter.getSession()),
    async signIn(input: LoginInput, options: AuthRequestOptions = {}) {
      const parsed = loginSchema.safeParse(input)
      if (!parsed.success)
        return {
          ok: false as const,
          error: {
            code: 'validation' as const,
            message: 'Revise os campos informados.',
            fields: authFieldErrors(parsed.error.issues),
          },
        }
      return request(() => adapter.signIn(parsed.data, options.signal), options)
    },
    async signUp(input: RegistrationInput, options: AuthRequestOptions = {}) {
      const parsed = registrationSchema.safeParse(input)
      if (!parsed.success)
        return {
          ok: false as const,
          error: {
            code: 'validation' as const,
            message: 'Revise os campos informados.',
            fields: authFieldErrors(parsed.error.issues),
          },
        }
      const { name, email, password } = parsed.data
      return request(() => adapter.signUp({ name, email, password }, options.signal), options)
    },
    signOut: () => request(() => adapter.signOut()),
  }
}

export const authService = createAuthService()
export type AuthService = ReturnType<typeof createAuthService>
