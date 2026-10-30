import type { DashboardSummary } from '../../types/finance'
import { formatMoney, formatSignedMoney } from '../../utils/financeFormat'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/Icon'

export function FinancialSummary({ summary }: { summary: DashboardSummary }) {
  const cards: {
    title: string
    value: string
    icon: IconName
    tone: string
    detail: string
    received?: boolean
  }[] = [
    {
      title: 'Saldo Disponível',
      value: formatMoney(summary.balanceCents),
      icon: 'wallet',
      tone: summary.balanceCents < 0 ? 'expense' : 'balance',
      detail: 'Receitas efetivadas menos despesas efetivadas no período. Não inclui pendências.',
    },
    {
      title: 'Receitas Efetivadas',
      value: formatSignedMoney(summary.incomeCents, 'income'),
      icon: 'arrowDown',
      tone: 'income',
      detail: `${summary.paidIncomeCount} ${summary.paidIncomeCount === 1 ? 'receita efetivada' : 'receitas efetivadas'} no período.`,
      received: summary.incomeCents > 0 && summary.pendingIncomeCents === 0,
    },
    {
      title: 'Despesas Efetivadas',
      value: formatSignedMoney(summary.expenseCents, 'expense'),
      icon: 'arrowUp',
      tone: 'expense',
      detail: `${summary.paidExpenseCount} ${summary.paidExpenseCount === 1 ? 'despesa efetivada' : 'despesas efetivadas'} no período.`,
    },
  ]
  return (
    <section aria-label="Resumo financeiro" className="dashboard-summary">
      {cards.map((card) => (
        <Card key={card.title} className={`summary-card summary-card--${card.tone}`}>
          <div className="summary-heading">
            <h2>{card.title}</h2>
            <span className="summary-icon">
              <Icon name={card.icon} />
            </span>
          </div>
          <p
            className={`summary-value financial-figure${card.value.length > 15 ? ' summary-value--compact' : ''}`}
          >
            {card.value}
          </p>
          <div className="summary-footnote">
            {card.received && <Badge tone="income">100% recebido</Badge>}
            <p>{card.detail}</p>
          </div>
        </Card>
      ))}
    </section>
  )
}
