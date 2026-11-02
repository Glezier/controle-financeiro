import { z } from 'zod'
import type { Category } from '../types/finance'

export const apiCategoryIcons = [
  { value: 'category', label: 'Geral', display: 'home' },
  { value: 'restaurant', label: 'Alimentação', display: 'shopping' },
  { value: 'home', label: 'Moradia', display: 'home' },
  { value: 'directions_bus', label: 'Transporte', display: 'transport' },
  { value: 'medical_services', label: 'Saúde', display: 'health' },
  { value: 'sports_esports', label: 'Lazer', display: 'leisure' },
  { value: 'account_balance_wallet', label: 'Salário e renda', display: 'income' },
  { value: 'work', label: 'Trabalho', display: 'income' },
  { value: 'school', label: 'Educação', display: 'leisure' },
  { value: 'shopping_cart', label: 'Compras', display: 'shopping' },
  { value: 'payments', label: 'Pagamentos', display: 'income' },
] as const

export const apiCategoryIconSchema = z.enum(apiCategoryIcons.map((item) => item.value))

export const apiCategoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da categoria.')
    .max(80, 'Use no máximo 80 caracteres.'),
  type: z.enum(['income', 'expense'], { error: 'Selecione receita ou despesa.' }),
  icon: apiCategoryIconSchema,
})

export type ApiCategoryInput = z.infer<typeof apiCategoryInputSchema>

export const apiCategorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  type: z.enum(['income', 'expense']),
  icon: apiCategoryIconSchema,
})

export function categoryFromApi(row: z.infer<typeof apiCategorySchema>): Category {
  const display = apiCategoryIcons.find((item) => item.value === row.icon)!.display
  const colors = {
    home: 'var(--color-primary)',
    shopping: 'var(--color-income)',
    transport: 'var(--color-primary-accent)',
    health: 'var(--color-error)',
    leisure: 'var(--color-ink-muted)',
    income: 'var(--color-income)',
  }

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    apiIcon: row.icon,
    appearance: { icon: display, color: colors[display] },
  }
}
