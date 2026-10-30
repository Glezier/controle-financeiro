import { Link } from 'react-router-dom'
import type { TransactionView } from '../../types/finance'
import { formatFinancialDate, formatPeriod, formatSignedMoney } from '../../utils/financeFormat'
import { Feedback } from '../feedback/Feedback'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { Icon } from '../ui/Icon'

export function RecentTransactions({
  transactions,
  total,
  period,
  onDetails,
}: {
  transactions: TransactionView[]
  total: number
  period: string
  onDetails: (transaction: TransactionView) => void
}) {
  return (
    <Card className="dashboard-transactions">
      <div className="dashboard-panel-heading">
        <h2>
          <Icon name="transactions" />
          Transações Recentes
        </h2>
        <span className="text-caption text-ink-secondary">{formatPeriod(period)}</span>
      </div>
      {transactions.length === 0 ? (
        <div className="p-space-lg">
          <Feedback kind="empty" title="Nenhuma transação neste período">
            Registre uma movimentação ou escolha outro mês.
          </Feedback>
        </div>
      ) : (
        <DataTable caption={`Transações recentes de ${formatPeriod(period)}`}>
          <thead>
            <tr>
              <th scope="col">Descrição</th>
              <th scope="col">Categoria</th>
              <th scope="col">Data</th>
              <th scope="col" className="amount-cell">
                Valor
              </th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <th scope="row">
                  <span
                    className={`transaction-description transaction-description--${transaction.type}`}
                  >
                    <span className="transaction-icon">
                      <Icon name={transaction.category.appearance?.icon ?? 'transactions'} />
                    </span>
                    <span className="transaction-name" title={transaction.description}>
                      {transaction.description}
                    </span>
                  </span>
                </th>
                <td className="text-ink-secondary">{transaction.category.name}</td>
                <td className="financial-figure text-ink-secondary">
                  <time dateTime={transaction.date}>{formatFinancialDate(transaction.date)}</time>
                </td>
                <td
                  className={`amount-cell ${transaction.type === 'income' ? 'text-income' : 'text-expense'}`}
                >
                  {formatSignedMoney(transaction.amountCents, transaction.type)}
                </td>
                <td>
                  <Badge tone={transaction.status === 'pending' ? 'pending' : 'income'}>
                    {transaction.status === 'pending' ? 'Pendente' : 'Efetivada'}
                  </Badge>
                </td>
                <td>
                  <Button
                    variant="ghost"
                    className="ui-icon-button"
                    aria-label={`Ver detalhes de ${transaction.description}`}
                    onClick={() => onDetails(transaction)}
                  >
                    <Icon name="more" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      <div className="dashboard-panel-footer">
        <span className="text-caption text-ink-secondary">
          {transactions.length} de {total} movimentações
        </span>
        <Link to={`/transacoes?period=${period}`} className="dashboard-text-link">
          Ver todas as transações
          <Icon name="arrowRight" />
        </Link>
      </div>
    </Card>
  )
}
