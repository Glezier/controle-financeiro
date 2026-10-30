import { createContext } from 'react'
import type { AuthState } from '../types/auth'
import type { AuthService } from '../services/authService'

export const AuthContext = createContext<{
  state: AuthState
  signIn: AuthService['signIn']
  signUp: AuthService['signUp']
  signOut: AuthService['signOut']
} | null>(null)
