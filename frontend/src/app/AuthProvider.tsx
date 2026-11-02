import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { authService } from '../services/authService'
import type { AuthState } from '../types/auth'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null })
  useEffect(() => {
    let active = true

    const onSessionExpired = () => {
      if (active) {
        setState({ status: 'anonymous', user: null })
      }
    }

    window.addEventListener('auth:expired', onSessionExpired)

    void authService.getSession().then((result) => {
      if (!active) return
      setState(
        result.ok && result.data
          ? { status: 'authenticated', user: result.data }
          : { status: 'anonymous', user: null },
      )
    })
    return () => {
      active = false
      window.removeEventListener('auth:expired', onSessionExpired)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        state,
        async signIn(input, options) {
          const result = await authService.signIn(input, options)
          if (result.ok && !options?.signal?.aborted)
            setState({ status: 'authenticated', user: result.data })
          return result
        },
        signUp: authService.signUp,
        async signOut() {
          const result = await authService.signOut()
          if (result.ok) setState({ status: 'anonymous', user: null })
          return result
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
