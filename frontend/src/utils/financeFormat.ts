export const MAX_AMOUNT_CENTS = 999_999_999_999 // PostgreSQL numeric(12,2).

export function parseBrlAmount(value: string): number | null {
  const text = value.trim().replace(/^R\$\s*/, '')
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(text)) return null
  const [whole, fraction = ''] = text.replaceAll('.', '').split(',')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) && cents > 0 && cents <= MAX_AMOUNT_CENTS ? cents : null
}

export function isFinancialDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function isFinancialPeriod(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && !value.startsWith('0000')
}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export function formatMoney(cents: number): string {
  return money.format(cents / 100)
}
export function amountInputValue(cents: number): string {
  return `${Math.trunc(cents / 100)},${String(cents % 100).padStart(2, '0')}`
}
export function formatSignedMoney(cents: number, type: 'income' | 'expense'): string {
  return `${type === 'income' ? '+' : '−'} ${formatMoney(cents)}`
}
export function formatFinancialDate(value: string): string {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}
export function formatPeriod(period: string): string {
  const [year, month] = period.split('-')
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(
    new Date(`${year}-${month}-01T12:00:00Z`),
  )
  return `${label.charAt(0).toLocaleUpperCase('pt-BR')}${label.slice(1)} / ${year}`
}
