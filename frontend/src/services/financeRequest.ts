import type { FinanceRequestOptions, FinanceResult } from '../types/finance'

export async function financeRequest<T>(
  operation: () => Promise<FinanceResult<T>>,
  options: FinanceRequestOptions,
): Promise<FinanceResult<T>> {
  await new Promise<void>((resolve) => {
    if (options.signal?.aborted) {
      resolve()
      return
    }
    const finish = () => {
      clearTimeout(timer)
      options.signal?.removeEventListener('abort', finish)
      resolve()
    }
    const timer = setTimeout(finish, 450)
    options.signal?.addEventListener('abort', finish, { once: true })
  })
  if (options.signal?.aborted)
    return { ok: false, error: { code: 'cancelled', message: 'Operação cancelada.' } }
  if (options.simulateFailure)
    return {
      ok: false,
      error: { code: 'unavailable', message: 'Falha de demonstração. Tente novamente.' },
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
