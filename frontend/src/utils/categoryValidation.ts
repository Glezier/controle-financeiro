import { z } from 'zod'

// Visual metadata only; these values do not extend the backend contract.
export const categoryColors = [
  { value: 'var(--color-primary)', label: 'Azul' },
  { value: 'var(--color-income)', label: 'Verde' },
  { value: 'var(--color-primary-accent)', label: 'Azul claro' },
  { value: 'var(--color-error)', label: 'Vermelho' },
  { value: 'var(--color-ink-muted)', label: 'Cinza' },
] as const
export const categoryIcons = [
  { value: 'home', label: 'Moradia' },
  { value: 'shopping', label: 'Compras' },
  { value: 'transport', label: 'Transporte' },
  { value: 'health', label: 'Saúde' },
  { value: 'leisure', label: 'Livros e lazer' },
  { value: 'income', label: 'Renda' },
] as const
export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome da categoria.')
    .max(80, 'Use no máximo 80 caracteres.'),
  type: z.enum(['income', 'expense'], { error: 'Selecione receita ou despesa.' }),
  description: z.string().trim().max(160, 'Use no máximo 160 caracteres.'),
  color: z.enum(
    categoryColors.map((item) => item.value),
    { error: 'Selecione uma cor disponível.' },
  ),
  icon: z.enum(
    categoryIcons.map((item) => item.value),
    { error: 'Selecione um ícone disponível.' },
  ),
})

export function categoryFieldErrors(issues: z.core.$ZodIssue[]): Record<string, string> {
  return Object.fromEntries(issues.map((issue) => [String(issue.path[0]), issue.message]))
}
