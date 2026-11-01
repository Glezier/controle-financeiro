import { describe, expect, it } from 'vitest';
import { amountSchema, dateSchema, filtersSchema, listSchema, monthlySchema, period, transactionSchema, escapeLike } from '../src/domain/schemas.js';

describe('Validação financeira', () => {
  it.each([0, -1, 1.001, 1.0000001, Number.NaN, Number.POSITIVE_INFINITY, 10_000_000_000])('rejeita valor inválido %s', (value) => {
    expect(amountSchema.safeParse(value).success).toBe(false);
  });
  it.each([0.01, 0.1, 0.29, 10.99, 9_999_999_999.99])('aceita valor em BRL %s', (value) => {
    expect(amountSchema.parse(value)).toBe(value);
  });
  it('valida dias reais, incluindo anos bissextos', () => {
    expect(dateSchema.safeParse('2026-02-29').success).toBe(false);
    expect(dateSchema.parse('2024-02-29')).toBe('2024-02-29');
    expect(dateSchema.safeParse('2026-10-29T00:00:00Z').success).toBe(false);
  });
  it('não permite forjar proprietário no corpo da requisição', () => {
    expect(transactionSchema.safeParse({ user_id: 'outro' }).success).toBe(false);
  });
  it('mês exige ano e paginação é limitada', () => {
    expect(filtersSchema.safeParse({ month: '10' }).success).toBe(false);
    expect(listSchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(listSchema.parse({})).toEqual({ page: 1, limit: 20 });
  });
  it('rejeita filtros desconhecidos e valores duplicados', () => {
    expect(filtersSchema.safeParse({ owner: 'x' }).success).toBe(false);
    expect(filtersSchema.safeParse({ type: ['income', 'expense'] }).success).toBe(false);
  });
  it('calcula intervalos exclusivos sem deslocar fuso ou dezembro', () => {
    expect(period({ year: 2026, month: 12 })).toEqual({ from: '2026-12-01', until: '2027-01-01' });
    expect(period({ year: 2024, month: 2 })).toEqual({ from: '2024-02-01', until: '2024-03-01' });
    expect(period({ year: 2026 })).toEqual({ from: '2026-01-01', until: '2027-01-01' });
    expect(period({})).toEqual({ from: null, until: null });
  });
  it('busca escapa os caracteres especiais do LIKE', () => {
    expect(escapeLike('10%_\\')).toBe('10\\%\\_\\\\');
  });
  it.each([
    { start_date: '2024-01-01' }, { end_date: '2024-03-31' },
    { start_date: '2024-03-31', end_date: '2024-01-01' },
    { start_date: '2024-01-01', end_date: '2024-03-31', year: 2024 },
    { start_date: '2024-02-30', end_date: '2024-03-31' },
  ])('rejeita intervalo inválido ou ambíguo: %j', (filters) => {
    expect(filtersSchema.safeParse(filters).success).toBe(false);
  });
  it('inclui o último dia e trata ano bissexto sem deslocar a data', () => {
    expect(period(filtersSchema.parse({ start_date: '2024-02-29', end_date: '2024-02-29' })))
      .toEqual({ from: '2024-02-29', until: '2024-03-01' });
    expect(period(filtersSchema.parse({ start_date: '2024-12-31', end_date: '2024-12-31' })))
      .toEqual({ from: '2024-12-31', until: '2025-01-01' });
  });
  it('exige um período no gráfico e limita a quantidade de meses retornados', () => {
    expect(monthlySchema.safeParse({}).success).toBe(false);
    expect(monthlySchema.safeParse({ start_date: '2010-01-01', end_date: '2020-01-01' }).success).toBe(false);
    expect(monthlySchema.safeParse({ start_date: '2010-01-01', end_date: '2019-12-31' }).success).toBe(true);
  });
});
