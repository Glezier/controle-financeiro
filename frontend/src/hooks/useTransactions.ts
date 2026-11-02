import { useEffect, useState } from 'react'
import { financeService } from '../services/financeService'
import type { Category, TransactionListSnapshot, TransactionQuery } from '../types/finance'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: TransactionListSnapshot }
type Metadata = { scope: string; categories: Category[]; periods: string[] }

export function useTransactions(scope: string, query: TransactionQuery, simulateFailure: boolean) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{ key: string; state: State; metadata?: Metadata } | null>(
    null,
  )
  const serializedQuery = JSON.stringify(query)
  const key = JSON.stringify([scope, serializedQuery, simulateFailure, revision])
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      void financeService
        .getTransactions(scope, JSON.parse(serializedQuery) as TransactionQuery, {
          signal: controller.signal,
          simulateFailure,
        })
        .then((response) => {
          if (controller.signal.aborted) return
          setResult((previous) => ({
            key,
            state: response.ok
              ? { status: 'success', data: response.data }
              : { status: 'error', message: response.error.message },
            metadata: response.ok
              ? {
                  scope,
                  categories: response.data.categories,
                  periods: response.data.availablePeriods,
                }
              : previous?.metadata?.scope === scope
                ? previous.metadata
                : undefined,
          }))
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setResult((previous) => ({
              key,
              state: {
                status: 'error',
                message: 'Não foi possível carregar as transações. Tente novamente.',
              },
              metadata: previous?.metadata?.scope === scope ? previous.metadata : undefined,
            }))
        })
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [scope, serializedQuery, simulateFailure, revision, key])
  const state: State = result?.key === key ? result.state : { status: 'loading' }
  return {
    state,
    metadata: result?.metadata?.scope === scope ? result.metadata : undefined,
    reload: () => setRevision((value) => value + 1),
  }
}
