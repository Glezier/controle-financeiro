import { describe, expect, it } from 'vitest'
import {
  authFieldErrors,
  authReturnPath,
  loginSchema,
  registrationSchema,
} from '../src/utils/authValidation'

const registration = {
  name: 'Ana Silva',
  email: 'ana@example.com',
  password: 'senha-demo-123',
  confirmPassword: 'senha-demo-123',
  acceptedDemo: true,
}

describe('authentication form validation', () => {
  it('normalizes email and name without changing the password', () => {
    const parsed = registrationSchema.parse({
      ...registration,
      name: '  Ana Silva  ',
      email: ' ANA@EXAMPLE.COM ',
      password: ' senha-demo-123 ',
      confirmPassword: ' senha-demo-123 ',
    })
    expect(parsed.name).toBe('Ana Silva')
    expect(parsed.email).toBe('ana@example.com')
    expect(parsed.password).toBe(' senha-demo-123 ')
  })
  it('reports invalid email and a short password on their fields', () => {
    const result = loginSchema.safeParse({ email: 'invalid', password: '123' })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(authFieldErrors(result.error.issues)).toEqual({
        email: 'Informe um e-mail válido.',
        password: 'A senha deve ter pelo menos 8 caracteres.',
      })
  })
  it('associates password mismatch with its confirmation field', () => {
    const result = registrationSchema.safeParse({ ...registration, confirmPassword: 'different' })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(authFieldErrors(result.error.issues).confirmPassword).toBe('As senhas não coincidem.')
  })
  it('requires the demonstration acknowledgement', () => {
    expect(registrationSchema.safeParse({ ...registration, acceptedDemo: false }).success).toBe(
      false,
    )
  })
  it('rejects whitespace names and values beyond provisional limits', () => {
    expect(registrationSchema.safeParse({ ...registration, name: '   ' }).success).toBe(false)
    expect(registrationSchema.safeParse({ ...registration, name: 'a'.repeat(101) }).success).toBe(
      false,
    )
    expect(
      loginSchema.safeParse({ email: registration.email, password: 'a'.repeat(129) }).success,
    ).toBe(false)
  })
  it.each([
    'https://example.com',
    '//example.com',
    '/login',
    '/cadastro',
    '/missing',
    undefined,
    { from: '/transacoes' },
  ])('does not accept unsafe or unsupported return paths: %j', (value) => {
    expect(authReturnPath(value)).toBe('/visao-geral')
  })
  it('preserves a known internal destination and its query', () => {
    expect(authReturnPath('/transacoes?status=pending')).toBe('/transacoes?status=pending')
  })
})
