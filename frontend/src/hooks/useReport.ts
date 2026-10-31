import { useEffect, useState } from 'react'
import { reportService } from '../services/reportService'
import type { ReportQuery, ReportSnapshot } from '../types/reports'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: ReportSnapshot }
export function useReport(scope: string, query: ReportQuery, simulateFailure: boolean) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{ key: string; state: State } | null>(null)
  const { period, range } = query
  const key = JSON.stringify([scope, period, range, simulateFailure, revision])
  useEffect(() => {
    const controller = new AbortController()
    void reportService
      .getReport(scope, { period, range }, { signal: controller.signal, simulateFailure })
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
              message: 'Não foi possível carregar o relatório. Tente novamente.',
            },
          })
      })
    return () => controller.abort()
  }, [scope, period, range, simulateFailure, revision, key])
  const state: State = result?.key === key ? result.state : { status: 'loading' }
  return { state, reload: () => setRevision((value) => value + 1) }
}
