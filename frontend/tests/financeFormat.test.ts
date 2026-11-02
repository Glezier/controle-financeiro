import { describe, expect, it } from 'vitest'
import {
  formatFinancialDate,
  formatMoney,
  formatPeriod,
  isFinancialDate,
  MAX_AMOUNT_CENTS,
  parseBrlAmount,
} from '../src/utils/financeFormat'
import { transactionSchema } from '../src/utils/transactionValidation'

describe('financial amounts and dates', () => {
  it.each([
    ['1.250,50', 125050],
    ['1250,5', 125050],
    ['0,01', 1],
    ['150', 15000],
    ['R$ 1.250,50', 125050],
    ['9.999.999.999,99', MAX_AMOUNT_CENTS],
  ])('parses %s without losing cents', (input, cents) => {
    expect(parseBrlAmount(String(input))).toBe(cents)
  })
  it.each(['0', '-1,00', '1,001', '1.23', '12.34,56', '1e3', '', 'NaN', '10.000.000.000,00'])(
    'rejects invalid or unsupported amount %s',
    (input) => {
      expect(parseBrlAmount(input)).toBeNull()
    },
  )
  it('keeps dates independent of timezone and validates the calendar', () => {
    expect(isFinancialDate('2024-02-29')).toBe(true)
    expect(isFinancialDate('2023-02-29')).toBe(false)
    expect(isFinancialDate('2024-04-31')).toBe(false)
    expect(isFinancialDate('0000-01-01')).toBe(false)
    expect(isFinancialDate('2024-10-01T00:00:00Z')).toBe(false)
    expect(formatFinancialDate('2024-10-01')).toBe('01/10/2024')
    expect(formatPeriod('2024-10')).toBe('Outubro / 2024')
  })
  it('formats zero and negative balances in BRL', () => {
    expect(formatMoney(0).replaceAll('\u00a0', ' ')).toBe('R$ 0,00')
    expect(formatMoney(-12345).replaceAll('\u00a0', ' ')).toBe('-R$ 123,45')
  })
  it('validates required transaction fields and trims descriptions', () => {
    const valid = {
      type: 'expense',
      status: 'paid',
      description: '  Livros  ',
      amount: '150,00',
      date: '2024-10-01',
      categoryId: '11111111-1111-4111-8111-111111111111',
    }
    expect(transactionSchema.parse(valid).description).toBe('Livros')
    for (const input of [
      { ...valid, description: ' ' },
      { ...valid, categoryId: '' },
      { ...valid, status: 'unknown' },
      { ...valid, type: 'transfer' },
      { ...valid, date: '2024-02-30' },
    ])
      expect(transactionSchema.safeParse(input).success).toBe(false)
  })
})
