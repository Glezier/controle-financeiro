import { useEffect, useRef, useState } from 'react'
import type { z } from 'zod'

type SubmissionOptions = { signal?: AbortSignal; simulateFailure?: boolean }
type SubmissionResult<Data> =
  | { ok: true; data: Data }
  | { ok: false; error: { message: string; fields?: Record<string, string> } }

export function useFormSubmission<T, Data>(
  schema: z.ZodType<T>,
  action: (input: T, options?: SubmissionOptions) => Promise<SubmissionResult<Data>>,
  onSuccess?: (data: Data) => void,
  failureMessage = 'Não foi possível concluir a operação. Tente novamente.',
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

  async function submit(input: unknown, simulateFailure = false) {
    if (controller.current) return
    setFailure('')
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      const fields: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const name = issue.path[0]
        if (typeof name === 'string' && !fields[name]) fields[name] = issue.message
      }
      setErrors(fields)
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
      if (!request.signal.aborted) setFailure(failureMessage)
    } finally {
      controller.current = null
      if (!request.signal.aborted) setBusy(false)
    }
  }
  return { formRef, busy, errors, failure, submit }
}
