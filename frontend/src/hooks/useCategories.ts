import { useEffect, useState } from 'react'
import { categoryService } from '../services/categoryService'
import type { CategorySnapshot } from '../types/finance'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: CategorySnapshot }

export function useCategories(scope: string, simulateFailure: boolean) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{ key: string; state: State } | null>(null)
  const key = JSON.stringify([scope, simulateFailure, revision])
  useEffect(() => {
    const controller = new AbortController()
    void categoryService
      .getCategories(scope, { signal: controller.signal, simulateFailure })
      .then((response) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            state: response.ok
              ? { status: 'success', data: response.data }
              : { status: 'error', message: response.error.message },
          })
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResult({
            key,
            state: {
              status: 'error',
              message: 'Não foi possível carregar as categorias. Tente novamente.',
            },
          })
      })
    return () => controller.abort()
  }, [scope, simulateFailure, revision, key])
  const state: State = result?.key === key ? result.state : { status: 'loading' }
  return { state, reload: () => setRevision((value) => value + 1) }
}
