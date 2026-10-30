import { useEffect, useState } from 'react'
import { financeService } from '../services/financeService'
import type { DashboardSnapshot } from '../types/finance'

type DashboardState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: DashboardSnapshot }

export function useDashboard(scope: string, period: string, simulateFailure: boolean) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{ key: string; state: DashboardState } | null>(null)
  const key = JSON.stringify([scope, period, simulateFailure, revision])
  useEffect(() => {
    const controller = new AbortController()
    void financeService
      .getDashboard(scope, period, { signal: controller.signal, simulateFailure })
      .then((response) => {
        if (controller.signal.aborted) return
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
              message: 'Não foi possível carregar os dados. Tente novamente.',
            },
          })
      })
    return () => controller.abort()
  }, [scope, period, simulateFailure, revision, key])
  // Derive loading immediately so the previous month's totals never appear under a new period.
  const state: DashboardState = result?.key === key ? result.state : { status: 'loading' }
  return { state, reload: () => setRevision((value) => value + 1) }
}
