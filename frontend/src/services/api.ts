import { z } from 'zod'

const API_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1'
).replace(/\/$/, '')

const SESSION_KEY = 'controle-financeiro.session.v1'

const sessionSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
})

export type ApiSession = z.infer<typeof sessionSchema>

export class ApiError extends Error {
  status: number
  code: string
  fields?: Record<string, string>

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export function readSession(): ApiSession | null {
  const stored = sessionStorage.getItem(SESSION_KEY)

  if (!stored) return null

  try {
    const parsed = sessionSchema.safeParse(JSON.parse(stored))

    if (parsed.success) return parsed.data
  } catch {
    // Uma sessão inválida deve ser descartada.
  }

  clearSession()
  return null
}

export function saveSession(session: ApiSession) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify(sessionSchema.parse(session)),
  )
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
  window.dispatchEvent(new Event('auth:expired'))
}

const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    issues: z.array(
      z.object({
        path: z.string(),
        message: z.string(),
      }),
    ).optional(),
  }),
})

async function send<T>(
  path: string,
  init: RequestInit,
  token?: string,
): Promise<T> {
  const headers = new Headers(init.headers)

  if (init.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const parsed = errorSchema.safeParse(body)

    if (parsed.success) {
      const { code, message, issues } = parsed.data.error

      throw new ApiError(
        response.status,
        code,
        message,
        issues
          ? Object.fromEntries(
              issues.map((issue) => [issue.path, issue.message]),
            )
          : undefined,
      )
    }

    throw new ApiError(
      response.status,
      'HTTP_ERROR',
      'Não foi possível concluir a requisição.',
    )
  }

  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}

let refreshing: Promise<void> | null = null

async function refreshSession() {
  if (!refreshing) {
    refreshing = (async () => {
      const previous = readSession()

      if (!previous) {
        throw new ApiError(401, 'NO_SESSION', 'Faça login novamente.')
      }

      try {
        const result = await send<{
          data: { session: ApiSession }
        }>('/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({
            refresh_token: previous.refresh_token,
          }),
        })

        // Não restaurar uma sessão encerrada ou substituída durante a chamada.
        if (readSession()?.refresh_token === previous.refresh_token) {
          saveSession(result.data.session)
        }
      } catch (error) {
        if (
          error instanceof ApiError &&
          (error.status === 400 || error.status === 401) &&
          readSession()?.refresh_token === previous.refresh_token
        ) {
          clearSession()
        }

        throw error
      }
    })().finally(() => {
      refreshing = null
    })
  }

  await refreshing
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Promise<T> {
  if (!authenticated) return send<T>(path, init)

  const session = readSession()

  if (!session) {
    clearSession()
    throw new ApiError(401, 'NO_SESSION', 'Faça login novamente.')
  }

  try {
    return await send<T>(path, init, session.access_token)
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error
    }
  }

  await refreshSession()
  init.signal?.throwIfAborted()

  const renewed = readSession()

  if (!renewed) {
    throw new ApiError(401, 'NO_SESSION', 'Faça login novamente.')
  }

  try {
    return await send<T>(path, init, renewed.access_token)
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      readSession()?.access_token === renewed.access_token
    ) {
      clearSession()
    }

    throw error
  }
}