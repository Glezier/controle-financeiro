import type { AuthAdapter, AuthResult } from '../types/auth'
import type { UserProfile } from '../types/profile'
import {
  api,
  ApiError,
  clearSession,
  readSession,
  saveSession,
} from './api'
import type { ApiSession } from './api'

interface ApiUser {
  id: string
  email: string
  full_name: string | null
}

function profile(user: ApiUser): UserProfile {
  return {
    name: user.full_name?.trim() || user.email.split('@')[0],
    email: user.email,
  }
}

async function result<T>(
  operation: () => Promise<T>,
): Promise<AuthResult<T>> {
  try {
    return { ok: true, data: await operation() }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        ok: false,
        error: { code: 'cancelled', message: 'Operação cancelada.' },
      }
    }

    if (error instanceof ApiError) {
      return {
        ok: false,
        error: {
          code:
            error.status === 401
              ? 'invalid_credentials'
              : error.status === 400
                ? 'validation'
                : 'unavailable',
          message: error.message,
          fields: error.fields,
        },
      }
    }

    return {
      ok: false,
      error: {
        code: 'unavailable',
        message: 'Não foi possível acessar a API. Confira a conexão.',
      },
    }
  }
}

export function createApiAuthAdapter(): AuthAdapter {
  return {
    getSession() {
      return result(async () => {
        if (!readSession()) return null

        try {
          const response = await api<{ data: ApiUser }>('/auth/me')
          return profile(response.data)
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            clearSession()
            return null
          }

          throw error
        }
      })
    },

    signIn(input, signal) {
      return result(async () => {
        const response = await api<{
          data: { user: ApiUser; session: ApiSession }
        }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(input),
          signal,
        }, false)

        signal?.throwIfAborted()
        saveSession(response.data.session)

        return profile(response.data.user)
      })
    },

    signUp(input, signal) {
      return result(async () => {
        await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            full_name: input.name,
            email: input.email,
            password: input.password,
          }),
          signal,
        }, false)

        // O fluxo atual retorna ao login depois do cadastro.
        return { name: input.name, email: input.email }
      })
    },

    signOut() {
      return result(async () => {
        if (readSession()) {
          try {
            await api('/auth/logout', { method: 'POST' })
          } catch (error) {
            if (!(error instanceof ApiError) || error.status !== 401) {
              throw error
            }
          }
        }

        clearSession()
        return null
      })
    },
  }
}