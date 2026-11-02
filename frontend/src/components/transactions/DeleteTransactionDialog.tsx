import { useEffect, useRef, useState } from 'react'
import { financeService } from '../../services/financeService'
import type { TransactionView } from '../../types/finance'
import { formatFinancialDate, formatSignedMoney } from '../../utils/financeFormat'
import { Feedback } from '../feedback/Feedback'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

type Props = {
  scope: string
  transaction: TransactionView | null
  onClose: () => void
  onDeleted: (transaction: TransactionView) => void
}

function Confirmation({
  scope,
  transaction,
  onClose,
  onDeleted,
}: Omit<Props, 'transaction'> & { transaction: TransactionView }) {
  const controller = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  useEffect(() => () => controller.current?.abort(), [])
  async function confirm() {
    if (controller.current) return
    const request = new AbortController()
    controller.current = request
    setBusy(true)
    setFailure('')
    try {
      const result = await financeService.deleteTransaction(scope, transaction.id, {
        signal: request.signal,
      })
      if (request.signal.aborted) return
      if (result.ok) onDeleted(transaction)
      else setFailure(result.error.message)
    } catch {
      if (!request.signal.aborted)
        setFailure('Não foi possível excluir a transação. Tente novamente.')
    } finally {
      controller.current = null
      if (!request.signal.aborted) setBusy(false)
    }
  }
  return (
    <div className="space-y-space-md" aria-busy={busy}>
      <p>
        Deseja excluir <strong className="break-words">{transaction.description}</strong>?
      </p>
      <p className="financial-figure">
        {formatSignedMoney(transaction.amountCents, transaction.type)} ·{' '}
        {formatFinancialDate(transaction.date)}
      </p>
      <p className="text-caption text-ink-secondary">
        A movimentação será removida da sua conta. Os indicadores serão recalculados conforme sua
        situação.
      </p>
      {failure && (
        <Feedback kind="error" title="Transação não excluída">
          {failure}
        </Feedback>
      )}
      <div className="transaction-form-actions">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          loading={busy}
          onClick={() => {
            void confirm()
          }}
        >
          {busy ? 'Excluindo…' : 'Excluir Transação'}
        </Button>
      </div>
    </div>
  )
}

export function DeleteTransactionDialog(props: Props) {
  return (
    <Modal title="Excluir transação" open={props.transaction !== null} onClose={props.onClose}>
      {props.transaction && (
        <Confirmation key={props.transaction.id} {...props} transaction={props.transaction} />
      )}
    </Modal>
  )
}
