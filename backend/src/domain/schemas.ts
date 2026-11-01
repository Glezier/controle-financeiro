import { z } from 'zod';
import { CATEGORY_ICONS } from './categories.js';

export const entryType = z.enum(['income', 'expense']);
export const entryStatus = z.enum(['paid', 'pending']);
export const idSchema = z.uuid();
export const dateSchema = z.iso.date().refine((value) => value >= '1900-01-01', 'Informe uma data a partir de 1900.');

export const amountSchema = z.number().finite().positive().max(9_999_999_999.99)
  .refine((value) => Number(value.toFixed(2)) === value,
    'O valor deve ter no máximo duas casas decimais.');

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(8).max(128),
  full_name: z.string().trim().min(2).max(100).optional(),
}).strict();
export const loginSchema = registerSchema.omit({ full_name: true }).extend({ password: z.string().min(1).max(128) });
export const refreshSchema = z.object({ refresh_token: z.string().min(1).max(4096) }).strict();
export const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: entryType,
  icon: z.enum(CATEGORY_ICONS).optional(),
}).strict();
export const categoryPatchSchema = categorySchema.partial()
  .refine((value) => Object.keys(value).length > 0, 'Informe ao menos um campo.');
export const transactionSchema = z.object({
  category_id: idSchema,
  type: entryType,
  amount: amountSchema,
  date: dateSchema,
  description: z.string().trim().min(1).max(300),
  status: entryStatus,
}).strict();
export const transactionPatchSchema = transactionSchema.partial()
  .refine((value) => Object.keys(value).length > 0, 'Informe ao menos um campo.');

const yearSchema = z.coerce.number().int().min(1900).max(9998);
const monthSchema = z.coerce.number().int().min(1).max(12);
const rangeDateSchema = dateSchema.refine((value) => value <= '9998-12-31', 'O filtro aceita datas até 9998-12-31.');
export const filtersSchema = z.object({
  year: yearSchema.optional(),
  month: monthSchema.optional(),
  start_date: rangeDateSchema.optional(),
  end_date: rangeDateSchema.optional(),
  category_id: idSchema.optional(),
  type: entryType.optional(),
  status: entryStatus.optional(),
  search: z.string().trim().max(100).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.month && !value.year) ctx.addIssue({ code: 'custom', path: ['year'], message: 'Informe o ano ao filtrar por mês.' });
  if (Boolean(value.start_date) !== Boolean(value.end_date)) {
    ctx.addIssue({ code: 'custom', path: ['start_date'], message: 'Informe start_date e end_date juntos.' });
  }
  if ((value.start_date || value.end_date) && (value.year || value.month)) {
    ctx.addIssue({ code: 'custom', path: ['start_date'], message: 'Use intervalo de datas ou mês/ano, sem misturar os dois.' });
  }
  if (value.start_date && value.end_date && value.start_date > value.end_date) {
    ctx.addIssue({ code: 'custom', path: ['end_date'], message: 'A data final deve ser igual ou posterior à inicial.' });
  }
});
export const listSchema = filtersSchema.safeExtend({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const categoryListSchema = z.object({ type: entryType.optional() }).strict();
export const monthlySchema = filtersSchema.superRefine((value, ctx) => {
  if (!value.year && !value.start_date) ctx.addIssue({ code: 'custom', path: ['year'], message: 'Informe ano ou intervalo de datas.' });
  if (value.start_date && value.end_date) {
    const months = (Number(value.end_date.slice(0, 4)) - Number(value.start_date.slice(0, 4))) * 12
      + Number(value.end_date.slice(5, 7)) - Number(value.start_date.slice(5, 7)) + 1;
    if (months > 120) ctx.addIssue({ code: 'custom', path: ['end_date'], message: 'O gráfico mensal aceita no máximo 120 meses por consulta.' });
  }
});
export type Filters = z.infer<typeof filtersSchema>;
export type ListFilters = z.infer<typeof listSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;

export function period(filters: Pick<Filters, 'month' | 'year' | 'start_date' | 'end_date'>) {
  if (filters.start_date && filters.end_date) {
    const next = new Date(`${filters.end_date}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return { from: filters.start_date, until: next.toISOString().slice(0, 10) };
  }
  if (!filters.year) return { from: null, until: null };
  const year = filters.year;
  const month = filters.month;
  if (!month) return { from: `${year}-01-01`, until: `${year + 1}-01-01` };
  return {
    from: `${year}-${String(month).padStart(2, '0')}-01`,
    until: month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`,
  };
}

export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, '\\$&');
}
