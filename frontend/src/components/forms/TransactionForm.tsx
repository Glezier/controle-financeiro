import { useEffect, useRef, useState } from 'react'
import type { Category, Transaction, TransactionDraft, TransactionType } from '../../types/finance'
import { amountInputValue } from '../../utils/financeFormat'
import { financeService } from '../../services/financeService'
import { transactionFieldErrors, transactionSchema } from '../../utils/transactionValidation'
import { Feedback } from '../feedback/Feedback'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { SelectField, TextField } from './Field'

export function TransactionForm({
  scope,
  period,
  categories,
  onSaved,
  onCancel,
  initialTransaction,
  defaultType = 'expense',
}: {
  scope: string
  period: string
  categories: Category[]
  onSaved: (transaction: Transaction) => void
  onCancel: () => void
  initialTransaction?: Transaction
  defaultType?: TransactionType
}) {
  const today = new Date()
  const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [values, setValues] = useState<TransactionDraft>(
    initialTransaction
      ? {
          type: initialTransaction.type,
          description: initialTransaction.description,
          amount: amountInputValue(initialTransaction.amountCents),
          date: initialTransaction.date,
          categoryId: initialTransaction.categoryId,
          status: initialTransaction.status,
        }
      : {
          type: defaultType,
          description: '',
          amount: '',
          date: localDate.startsWith(period) ? localDate : `${period}-01`,
          categoryId: '',
          status: 'paid',
        },
  )
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [failure, setFailure] = useState('')
  const controller = useRef<AbortController | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => {
    if (Object.keys(errors).length)
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [errors])
  const compatibleCategories = categories.filter((category) => category.type === values.type)

  async function submit() {
    if (controller.current) return
    setFailure('')
    const parsed = transactionSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(transactionFieldErrors(parsed.error.issues))
      return
    }
    setErrors({})
    const request = new AbortController()
    controller.current = request
    setBusy(true)
    try {
      const result = initialTransaction
        ? await financeService.updateTransaction(scope, initialTransaction.id, parsed.data, {
            signal: request.signal,
          })
        : await financeService.createTransaction(scope, parsed.data, { signal: request.signal })
      if (request.signal.aborted) return
      if (result.ok) onSaved(result.data)
      else {
        setFailure(result.error.message)
        if (result.error.fields) setErrors(result.error.fields)
      }
    } catch {
      if (!request.signal.aborted)
        setFailure('Não foi possível salvar a transação. Tente novamente.')
    } finally {
      controller.current = null
      if (!request.signal.aborted) setBusy(false)
    }
  }

  return (
    <form
      ref={formRef}
      className="transaction-form"
      aria-label={initialTransaction ? 'Editar transação' : 'Nova transação'}
      aria-busy={busy}
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      {failure && (
        <Feedback kind="error" title="Transação não salva">
          {failure}
        </Feedback>
      )}
      <fieldset disabled={busy} className="transaction-form-fields">
        <fieldset className="transaction-type">
          <legend>Tipo de Transação</legend>
          <div>
            {(['income', 'expense'] as const).map((type) => (
              <label key={type} className="transaction-type-option">
                <input
                  className="sr-only"
                  type="radio"
                  name="type"
                  value={type}
                  checked={values.type === type}
                  onChange={() => setValues({ ...values, type, categoryId: '' })}
                />
                <Icon name={type === 'income' ? 'arrowDown' : 'arrowUp'} />
                {type === 'income' ? 'Receita' : 'Despesa'}
              </label>
            ))}
          </div>
        </fieldset>
        <TextField
          label="Descrição"
          name="description"
          value={values.description}
          onChange={(event) => setValues({ ...values, description: event.target.value })}
          placeholder="Ex.: bolsa de pesquisa, material de estudo…"
          maxLength={200}
          required
          error={errors.description}
        />
        <div className="transaction-form-grid">
          <TextField
            label="Valor (R$)"
            name="amount"
            inputMode="decimal"
            value={values.amount}
            onChange={(event) => setValues({ ...values, amount: event.target.value })}
            placeholder="0,00"
            maxLength={20}
            required
            error={errors.amount}
            hint="Ex.: 1.250,50"
          />
          <TextField
            label="Data"
            name="date"
            type="date"
            min="0001-01-01"
            max="9999-12-31"
            value={values.date}
            onChange={(event) => setValues({ ...values, date: event.target.value })}
            required
            error={errors.date}
          />
        </div>
        <div className="transaction-form-grid">
          <SelectField
            label="Categoria"
            name="categoryId"
            value={values.categoryId}
            onChange={(event) => setValues({ ...values, categoryId: event.target.value })}
            required
            error={errors.categoryId}
          >
            <option value="">Selecione uma categoria</option>
            {compatibleCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Situação"
            name="status"
            value={values.status}
            onChange={(event) =>
              setValues({ ...values, status: event.target.value as TransactionDraft['status'] })
            }
            required
            error={errors.status}
          >
            <option value="paid">Efetivada (paga ou recebida)</option>
            <option value="pending">Pendente (a efetivar)</option>
          </SelectField>
        </div>
        {compatibleCategories.length === 0 && (
          <Feedback kind="empty" title="Nenhuma categoria compatível">
            Não é possível registrar esse tipo de movimentação sem uma categoria compatível.
          </Feedback>
        )}
      </fieldset>
      <p className="text-caption text-ink-secondary">
        Pendências não entram no saldo disponível. Dados desta demonstração são mantidos apenas até
        recarregar a página.
      </p>
      <div className="transaction-form-actions">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={busy} disabled={compatibleCategories.length === 0}>
          {busy ? 'Salvando…' : initialTransaction ? 'Salvar Alterações' : 'Salvar Transação'}
        </Button>
      </div>
    </form>
  )
}
