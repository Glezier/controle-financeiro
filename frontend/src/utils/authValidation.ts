import { z } from 'zod'

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'O e-mail deve ter até 254 caracteres.')
  .pipe(z.email({ error: 'Informe um e-mail válido.' }))
const password = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .max(128, 'A senha deve ter até 128 caracteres.')

// Provisional client limits; confirm them with the future authentication API.
export const loginSchema = z.object({ email, password })
export const registrationSchema = loginSchema
  .extend({
    name: z
      .string()
      .trim()
      .min(2, 'Informe seu nome, com pelo menos 2 caracteres.')
      .max(100, 'O nome deve ter até 100 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirme sua senha.'),
    acceptedDemo: z
      .boolean()
      .refine((value) => value, 'Confirme que compreende o uso demonstrativo.'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  })

export function authFieldErrors(issues: readonly z.core.$ZodIssue[]): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of issues) {
    const name = issue.path[0]
    if (typeof name === 'string' && !fields[name]) fields[name] = issue.message
  }
  return fields
}

export function authReturnPath(value: unknown): string {
  if (typeof value !== 'string') return '/visao-geral'
  const path = value.split('?')[0]
  return ['/visao-geral', '/transacoes', '/categorias', '/relatorios', '/componentes'].includes(
    path,
  )
    ? value
    : '/visao-geral'
}
