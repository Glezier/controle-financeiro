import type { Category, TransactionQuery } from '../../types/finance'
import { formatPeriod } from '../../utils/financeFormat'
import { TextField, SelectField } from '../forms/Field'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Card } from '../ui/Card'

export function TransactionFilters({
  query,
  categories,
  periods,
  onChange,
  onReset,
}: {
  query: TransactionQuery
  categories: Category[]
  periods: string[]
  onChange: (changes: Partial<TransactionQuery>, replace?: boolean) => void
  onReset: () => void
}) {
  const knownCategory =
    query.categoryId === 'all' || categories.some((item) => item.id === query.categoryId)
  return (
    <Card>
      <form
        className="transaction-filters"
        aria-label="Filtros de transações"
        onSubmit={(event) => event.preventDefault()}
      >
        <TextField
          label="Buscar por descrição"
          type="search"
          name="search"
          placeholder="Buscar por descrição…"
          maxLength={200}
          value={query.search}
          onChange={(event) => onChange({ search: event.target.value }, true)}
        />
        <SelectField
          label="Período"
          value={query.period}
          onChange={(event) => onChange({ period: event.target.value })}
        >
          <option value="all">Todo o Período</option>
          {periods.map((period) => (
            <option key={period} value={period}>
              {formatPeriod(period)}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Tipo"
          value={query.type}
          onChange={(event) => onChange({ type: event.target.value as TransactionQuery['type'] })}
        >
          <option value="all">Todos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </SelectField>
        <SelectField
          label="Categoria"
          value={query.categoryId}
          onChange={(event) => onChange({ categoryId: event.target.value })}
        >
          <option value="all">Todas</option>
          {!knownCategory && <option value={query.categoryId}>Categoria indisponível</option>}
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Situação"
          value={query.status}
          onChange={(event) =>
            onChange({ status: event.target.value as TransactionQuery['status'] })
          }
        >
          <option value="all">Todas</option>
          <option value="paid">Efetivada</option>
          <option value="pending">Pendente</option>
        </SelectField>
        <Button variant="secondary" onClick={onReset}>
          <Icon name="clearFilter" />
          Limpar filtros
        </Button>
      </form>
    </Card>
  )
}
