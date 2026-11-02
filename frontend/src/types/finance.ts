export type TransactionType = 'income' | 'expense'
export type TransactionStatus = 'paid' | 'pending'

export interface Category {
  id: string
  name: string
  type: TransactionType
  // Identificador persistido pelo backend; appearance contém sua apresentação.
  apiIcon?: string
  // Provisional display metadata; not fields of the backend schema.
  appearance?: {
    color: string
    icon: 'home' | 'shopping' | 'transport' | 'health' | 'leisure' | 'income'
    description?: string
  }
}

export interface Transaction {
  id: string
  categoryId: string
  type: TransactionType
  amountCents: number
  date: string
  description: string
  status: TransactionStatus
  createdAt: string
}
export interface TransactionView extends Transaction {
  category: Category
}
export interface TransactionDraft {
  type: TransactionType
  amount: string
  date: string
  description: string
  categoryId: string
  status: TransactionStatus
}
export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>

export interface DashboardSummary {
  incomeCents: number
  expenseCents: number
  balanceCents: number
  paidIncomeCount: number
  paidExpenseCount: number
  pendingIncomeCents: number
  pendingExpenseCents: number
  pendingCount: number
  nextPendingDate: string | null
}
export interface CategoryExpense {
  category: Category
  amountCents: number
  percentage: number
}
export interface DashboardSnapshot {
  period: string
  availablePeriods: string[]
  categories: Category[]
  summary: DashboardSummary
  recentTransactions: TransactionView[]
  expensesByCategory: CategoryExpense[]
  transactionCount: number
}

export type FinanceResult<T> =
  | { ok: true; data: T }
  | {
      ok: false
      error: {
        code: 'validation' | 'unavailable' | 'cancelled' | 'not_found' | 'in_use' | 'duplicate'
        message: string
        fields?: Record<string, string>
      }
    }
export interface FinanceRequestOptions {
  signal?: AbortSignal
  simulateFailure?: boolean
}
// scope is a mock-only owner key, never a proposed authorization mechanism.
export interface FinanceAdapter {
  listCategories(scope: string): Promise<Category[]>
  listTransactions(scope: string): Promise<Transaction[]>
  createTransaction(scope: string, input: NewTransaction): Promise<Transaction>
  updateTransaction(scope: string, id: string, input: NewTransaction): Promise<Transaction | null>
  deleteTransaction(scope: string, id: string): Promise<boolean>
  createCategory(scope: string, input: CategoryValues): Promise<CategoryWriteResult<Category>>
  updateCategory(
    scope: string,
    id: string,
    input: CategoryValues,
  ): Promise<CategoryWriteResult<Category>>
  deleteCategory(scope: string, id: string): Promise<CategoryWriteResult<null>>
}

export type CategoryValues = Pick<Category, 'name' | 'type' | 'appearance'>
export type CategoryWriteResult<T> =
  { ok: true; data: T } | { ok: false; reason: 'not_found' | 'in_use' | 'duplicate' }
export interface CategoryView extends Category {
  transactionCount: number
}
export interface CategorySnapshot {
  items: CategoryView[]
  total: number
  incomeCount: number
  expenseCount: number
}
export interface CategoryDraft {
  name: string
  type: TransactionType
  description: string
  color: string
  icon: NonNullable<Category['appearance']>['icon']
}

export interface TransactionQuery {
  period: string
  type: TransactionType | 'all'
  categoryId: string
  status: TransactionStatus | 'all'
  search: string
  page: number
}

export interface TransactionListSnapshot {
  items: TransactionView[]
  total: number
  totalRecords: number
  page: number
  pageSize: number
  totalPages: number
  categories: Category[]
  availablePeriods: string[]
  summary: DashboardSummary
}
