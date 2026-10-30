import type { Category, FinanceAdapter, NewTransaction, Transaction } from '../types/finance'
import { MAX_AMOUNT_CENTS } from '../utils/financeFormat'

export const financeDemoPeriod = '2024-10'

function createCategories(): Category[] {
  return [
    {
      id: crypto.randomUUID(),
      name: 'Moradia',
      type: 'expense',
      appearance: { color: 'var(--color-primary)', icon: 'home' },
    },
    {
      id: crypto.randomUUID(),
      name: 'Alimentação',
      type: 'expense',
      appearance: { color: 'var(--color-income)', icon: 'shopping' },
    },
    {
      id: crypto.randomUUID(),
      name: 'Transporte',
      type: 'expense',
      appearance: { color: 'var(--color-primary-accent)', icon: 'transport' },
    },
    {
      id: crypto.randomUUID(),
      name: 'Saúde',
      type: 'expense',
      appearance: { color: 'var(--color-error)', icon: 'health' },
    },
    {
      id: crypto.randomUUID(),
      name: 'Lazer',
      type: 'expense',
      appearance: { color: 'var(--color-ink-muted)', icon: 'leisure' },
    },
    {
      id: crypto.randomUUID(),
      name: 'Salário & Renda',
      type: 'income',
      appearance: { color: 'var(--color-income)', icon: 'income' },
    },
  ]
}

function seedTransactions(categories: Category[]): Transaction[] {
  const transaction = (
    categoryIndex: number,
    description: string,
    amountCents: number,
    date: string,
    status: 'paid' | 'pending' = 'paid',
  ): Transaction => ({
    id: crypto.randomUUID(),
    categoryId: categories[categoryIndex].id,
    type: categories[categoryIndex].type,
    amountCents,
    description,
    date,
    status,
    createdAt: `${date}T12:00:00.000Z`,
  })
  return [
    transaction(5, 'Salário Mensal', 500_000, '2024-10-05'),
    transaction(0, 'Aluguel & Condomínio', 145_000, '2024-10-10'),
    transaction(1, 'Supermercado Semanal', 42_030, '2024-10-14'),
    transaction(5, 'Consultoria Freelance', 80_000, '2024-10-18'),
    transaction(3, 'Farmácia', 15_920, '2024-10-20'),
    transaction(2, 'Transporte Urbano', 20_000, '2024-10-22'),
    transaction(4, 'Livros & Lazer', 15_000, '2024-10-23'),
    transaction(0, 'Internet Fibra', 35_000, '2024-10-28', 'pending'),
    transaction(5, 'Salário Mensal', 500_000, '2024-09-05'),
    transaction(0, 'Aluguel & Condomínio', 145_000, '2024-09-10'),
    transaction(1, 'Supermercado', 42_000, '2024-09-14'),
  ]
}

export function createMockFinance(): FinanceAdapter {
  const stores = new Map<string, { categories: Category[]; transactions: Transaction[] }>()
  function storeFor(scope: string) {
    const key = scope.trim().toLowerCase()
    if (!key) throw new Error('Missing mock owner')
    let store = stores.get(key)
    if (!store) {
      const categories = createCategories()
      store = {
        categories,
        transactions: key === 'lucas.mendes@email.com' ? seedTransactions(categories) : [],
      }
      stores.set(key, store)
    }
    return store
  }
  return {
    async listCategories(scope) {
      return structuredClone(storeFor(scope).categories)
    },
    async listTransactions(scope) {
      return structuredClone(storeFor(scope).transactions)
    },
    async createTransaction(scope, input: NewTransaction) {
      const store = storeFor(scope)
      if (
        !store.categories.some((item) => item.id === input.categoryId && item.type === input.type)
      )
        throw new Error('Incompatible category')
      if (
        !Number.isSafeInteger(input.amountCents) ||
        input.amountCents <= 0 ||
        input.amountCents > MAX_AMOUNT_CENTS
      )
        throw new Error('Invalid amount')
      const transaction = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
      store.transactions.push(transaction)
      return structuredClone(transaction)
    },
  }
}
