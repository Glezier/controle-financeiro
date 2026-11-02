import type { UserProfile } from './profile'

export interface LoginInput {
  email: string
  password: string
}
export interface RegistrationInput extends LoginInput {
  name: string
  confirmPassword: string
  acceptedDemo: boolean
}

export type AuthErrorCode =
  'validation' | 'invalid_credentials' | 'email_exists' | 'unavailable' | 'cancelled'
export type AuthResult<T> =
  | { ok: true; data: T }
  | {
      ok: false
      error: { code: AuthErrorCode; message: string; fields?: Record<string, string> }
    }

export interface AuthRequestOptions {
  signal?: AbortSignal
  simulateFailure?: boolean
}

// Frontend adapter contract only; no server endpoints or token format are defined.
export interface AuthAdapter {
  getSession(): Promise<AuthResult<UserProfile | null>>
  signIn(input: LoginInput, signal?: AbortSignal): Promise<AuthResult<UserProfile>>
  signUp(
    input: Pick<RegistrationInput, 'name' | 'email' | 'password'>,
    signal?: AbortSignal,
  ): Promise<AuthResult<UserProfile>>
  signOut(): Promise<AuthResult<null>>
}

export type AuthState =
  { status: 'loading' | 'anonymous'; user: null } | { status: 'authenticated'; user: UserProfile }
