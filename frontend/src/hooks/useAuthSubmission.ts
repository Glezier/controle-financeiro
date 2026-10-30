import { useEffect, useRef, useState } from 'react'
import type { z } from 'zod'
import type { AuthRequestOptions, AuthResult } from '../types/auth'
import type { UserProfile } from '../types/profile'
import { authFieldErrors } from '../utils/authValidation'

export function useAuthSubmission<T>(
  schema: z.ZodType<T>,
  action: (input: T, options?: AuthRequestOptions) => Promise<AuthResult<UserProfile>>,
  onSuccess?: (user: UserProfile) => void,
) {
  const formRef = useRef<HTMLFormElement>(null)
  const controller = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [failure, setFailure] = useState('')
  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => {
    if (Object.keys(errors).length)
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [errors])

  async function submit(input: T, simulateFailure = false) {
    if (controller.current) return
    setFailure('')
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      setErrors(authFieldErrors(parsed.error.issues))
      return
    }
    setErrors({})
    const request = new AbortController()
    controller.current = request
    setBusy(true)
    try {
      const result = await action(parsed.data, { signal: request.signal, simulateFailure })
      if (request.signal.aborted) return
      if (result.ok) onSuccess?.(result.data)
      else {
        setFailure(result.error.message)
        if (result.error.fields) setErrors(result.error.fields)
      }
    } catch {
      if (!request.signal.aborted)
        setFailure('Não foi possível concluir a operação. Tente novamente.')
    } finally {
      controller.current = null
      if (!request.signal.aborted) setBusy(false)
    }
  }
  return { formRef, busy, errors, failure, submit }
}
