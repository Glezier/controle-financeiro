import type { TransactionView } from '../../types/finance'
import { formatFinancialDate, formatSignedMoney } from '../../utils/financeFormat'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'

export function TransactionDetails({
  transaction,
  onClose,
}: {
  transaction: TransactionView | null
  onClose: () => void
}) {
  return (
    <Modal title="Detalhes da transação" open={transaction !== null} onClose={onClose}>
      {transaction && (
        <dl className="transaction-details">
          <div>
            <dt>Descrição</dt>
            <dd>{transaction.description}</dd>
          </div>
          <div>
            <dt>Categoria</dt>
            <dd>{transaction.category.name}</dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>
              <time dateTime={transaction.date}>{formatFinancialDate(transaction.date)}</time>
            </dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>{transaction.type === 'income' ? 'Receita' : 'Despesa'}</dd>
          </div>
          <div>
            <dt>Valor</dt>
            <dd
              className={`financial-figure ${transaction.type === 'income' ? 'text-income' : 'text-expense'}`}
            >
              {formatSignedMoney(transaction.amountCents, transaction.type)}
            </dd>
          </div>
          <div>
            <dt>Situação</dt>
            <dd>
              <Badge tone={transaction.status === 'pending' ? 'pending' : 'income'}>
                {transaction.status === 'pending' ? 'Pendente' : 'Efetivada'}
              </Badge>
            </dd>
          </div>
        </dl>
      )}
    </Modal>
  )
}
