import type { TransactionListSnapshot, TransactionView } from '../../types/finance'
import { formatFinancialDate, formatMoney, formatSignedMoney } from '../../utils/financeFormat'
import { Feedback } from '../feedback/Feedback'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { Icon } from '../ui/Icon'

export function TransactionTable({
  data,
  onDetails,
  onEdit,
  onDelete,
  onPage,
}: {
  data: TransactionListSnapshot
  onDetails: (transaction: TransactionView) => void
  onEdit: (transaction: TransactionView) => void
  onDelete: (transaction: TransactionView) => void
  onPage: (page: number) => void
}) {
  const start = data.total ? (data.page - 1) * data.pageSize + 1 : 0
  const end = Math.min(data.page * data.pageSize, data.total)
  return (
    <Card className="transactions-table">
      {data.items.length === 0 ? (
        <div className="p-space-lg">
          <Feedback
            kind="empty"
            title={
              data.totalRecords === 0
                ? 'Nenhuma movimentação cadastrada'
                : 'Nenhuma transação encontrada'
            }
          >
            {data.totalRecords === 0
              ? 'Use Nova Transação para começar sua demonstração.'
              : 'Altere a busca ou limpe os filtros para consultar outras movimentações.'}
          </Feedback>
        </div>
      ) : (
        <DataTable caption="Transações financeiras filtradas">
          <thead>
            <tr>
              <th scope="col">Tipo</th>
              <th scope="col">Descrição</th>
              <th scope="col">Categoria</th>
              <th scope="col">Data</th>
              <th scope="col" className="amount-cell">
                Valor
              </th>
              <th scope="col">Status</th>
              <th scope="col">Ações</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((transaction) => (
              <tr key={transaction.id}>
                <td>
                  <Badge tone={transaction.type}>
                    {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                  </Badge>
                </td>
                <th scope="row">
                  <span
                    className={`transaction-description transaction-description--${transaction.type}`}
                  >
                    <span className="transaction-icon">
                      <Icon name={transaction.category.appearance?.icon ?? 'transactions'} />
                    </span>
                    <Button
                      variant="ghost"
                      className="transaction-detail-link"
                      title={transaction.description}
                      aria-label={`Ver detalhes de ${transaction.description}`}
                      onClick={() => onDetails(transaction)}
                    >
                      <span className="transaction-name">{transaction.description}</span>
                    </Button>
                  </span>
                </th>
                <td>
                  <Badge>{transaction.category.name}</Badge>
                </td>
                <td className="financial-figure">
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
                  <div className="transaction-row-actions">
                    <Button
                      variant="ghost"
                      className="ui-icon-button"
                      aria-label={`Editar ${transaction.description}`}
                      onClick={() => onEdit(transaction)}
                    >
                      <Icon name="edit" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="ui-icon-button transaction-delete-action"
                      aria-label={`Excluir ${transaction.description}`}
                      onClick={() => onDelete(transaction)}
                    >
                      <Icon name="trash" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      <div className="transaction-table-footer">
        <div>
          <p role="status" className="text-caption text-ink-secondary">
            Exibindo {start}–{end} de {data.total} transações
          </p>
          <p className="text-caption mt-space-xs">
            Saldo dos resultados:{' '}
            <strong className="financial-figure text-primary">
              {formatMoney(data.summary.balanceCents)}
            </strong>
          </p>
        </div>
        <nav aria-label="Paginação de transações" className="transaction-pagination">
          <Button
            variant="secondary"
            disabled={data.page === 1}
            onClick={() => onPage(data.page - 1)}
          >
            Anterior
          </Button>
          <span className="text-caption financial-figure">
            Página {data.page} de {data.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={data.page >= data.totalPages}
            onClick={() => onPage(data.page + 1)}
          >
            Próxima
          </Button>
        </nav>
      </div>
    </Card>
  )
}
