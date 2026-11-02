import { z } from 'zod'
import { isFinancialDate, parseBrlAmount } from './financeFormat'

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense'], { error: 'Escolha receita ou despesa.' }),
  description: z
    .string()
    .trim()
    .min(1, 'Informe uma descrição.')
    .max(200, 'Use até 200 caracteres na descrição.'),
  amount: z
    .string()
    .trim()
    .refine(
      (value) => parseBrlAmount(value) !== null,
      'Informe um valor positivo em reais, com até duas casas decimais.',
    ),
  date: z.string().refine(isFinancialDate, 'Informe uma data válida.'),
  categoryId: z.uuid({ error: 'Selecione uma categoria válida.' }),
  status: z.enum(['paid', 'pending'], { error: 'Selecione uma situação válida.' }),
})

export function transactionFieldErrors(
  issues: readonly z.core.$ZodIssue[],
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of issues) {
    const field = issue.path[0]
    if (typeof field === 'string' && !errors[field]) errors[field] = issue.message
  }
  return errors
}
