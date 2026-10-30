import { Link } from 'react-router-dom'
import type { CategoryExpense } from '../../types/finance'
import { formatMoney } from '../../utils/financeFormat'
import { Feedback } from '../feedback/Feedback'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'

export function ExpensesChart({
  items,
  totalCents,
}: {
  items: CategoryExpense[]
  totalCents: number
}) {
  let offset = 0
  const segments: (CategoryExpense & { offset: number })[] = []
  for (const item of items) {
    segments.push({ ...item, offset })
    offset += item.percentage
  }
  const total = formatMoney(totalCents)
  return (
    <Card className="dashboard-expenses">
      <div className="dashboard-panel-heading">
        <h2>
          <Icon name="pie" />
          Despesas por Categoria
        </h2>
      </div>
      {totalCents === 0 ? (
        <Feedback kind="empty" title="Sem despesas efetivadas">
          O gráfico aparecerá quando houver despesas pagas no período.
        </Feedback>
      ) : (
        <figure>
          <div className="expense-donut">
            <svg viewBox="0 0 200 200" aria-hidden="true">
              <circle
                cx="100"
                cy="100"
                r="78"
                fill="none"
                stroke="var(--color-surface-strong)"
                strokeWidth="24"
              />
              <g transform="rotate(-90 100 100)">
                {segments.map((item) => (
                  <circle
                    key={item.category.id}
                    cx="100"
                    cy="100"
                    r="78"
                    pathLength="100"
                    fill="none"
                    stroke={item.category.appearance?.color ?? 'var(--color-primary)'}
                    strokeWidth="24"
                    strokeDasharray={`${item.percentage} ${100 - item.percentage}`}
                    strokeDashoffset={-item.offset}
                  />
                ))}
              </g>
            </svg>
            <div className="expense-donut-label">
              <span className="text-label uppercase text-ink-secondary">Total Despesas</span>
              <span
                className={`financial-figure font-semibold${total.length > 14 ? ' expense-donut-compact' : ''}`}
              >
                {total}
              </span>
            </div>
          </div>
          <figcaption>
            <span className="sr-only">Distribuição das despesas efetivadas por categoria</span>
            <ul className="expense-legend">
              {items.map((item) => (
                <li key={item.category.id}>
                  <span className="expense-label">
                    <span
                      className="expense-swatch"
                      style={{
                        backgroundColor: item.category.appearance?.color ?? 'var(--color-primary)',
                      }}
                      aria-hidden="true"
                    />
                    <span>{item.category.name}</span>
                  </span>
                  <span className="text-caption text-ink-secondary financial-figure">
                    {new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(
                      item.percentage,
                    )}
                    %
                  </span>
                  <span className="font-semibold financial-figure">
                    {formatMoney(item.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
          </figcaption>
        </figure>
      )}
      <div className="expense-chart-footer">
        <span>Base de cálculo: despesas efetivadas</span>
        <Link to="/categorias" className="dashboard-text-link">
          Gerenciar Categorias
        </Link>
      </div>
    </Card>
  )
}
