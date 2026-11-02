import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTransactions } from '../hooks/useTransactions'
import { currentFinancialPeriod } from '../utils/apiTransaction'
import type { Transaction, TransactionQuery, TransactionView } from '../types/finance'
import { formatPeriod, isFinancialPeriod } from '../utils/financeFormat'
import { readTransactionQuery, writeTransactionQuery } from '../utils/transactionQuery'
import { FinancialSummary } from '../components/dashboard/FinancialSummary'
import { TransactionForm } from '../components/forms/TransactionForm'
import { TransactionFilters } from '../components/transactions/TransactionFilters'
import { TransactionTable } from '../components/transactions/TransactionTable'
import { TransactionDetails } from '../components/transactions/TransactionDetails'
import { DeleteTransactionDialog } from '../components/transactions/DeleteTransactionDialog'
import { Feedback } from '../components/feedback/Feedback'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Icon } from '../components/ui/Icon'

type FormState = { kind: 'create' } | { kind: 'edit'; transaction: TransactionView }

export function TransactionsPage() {
  const { state: auth } = useAuth()
  const [params, setParams] = useSearchParams()
  const query = readTransactionQuery(params, 'all')
  const queryKey = writeTransactionQuery(query).toString()
  const { state, metadata, reload } = useTransactions(
    auth.user?.email ?? '',
    query,
    params.get('cenario') === 'erro',
  )
  const [form, setForm] = useState<FormState | null>(() => params.get('new') === '1' ? { kind: 'create' } : null)
  const [details, setDetails] = useState<TransactionView | null>(null)
  const [deleting, setDeleting] = useState<TransactionView | null>(null)
  const [notice, setNotice] = useState<{ key: string; title: string } | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const focusAfterMutation = useRef(false)
  useEffect(() => {
    document.title = 'Transações | Controle Financeiro'
  }, [])
  useEffect(() => {
    if (state.status === 'success' && focusAfterMutation.current) {
      focusAfterMutation.current = false
      heading.current?.focus()
    }
  }, [state])
  if (!auth.user) return null
  const categories = metadata?.categories ?? []
  const periods =
    metadata?.periods ??
    Array.from(
      new Set([currentFinancialPeriod(), ...(isFinancialPeriod(query.period) ? [query.period] : [])]),
    )
      .sort()
      .reverse()
  const month = isFinancialPeriod(query.period) ? query.period : currentFinancialPeriod()
  function change(changes: Partial<TransactionQuery>, replace = false) {
    setNotice(null)
    setParams(writeTransactionQuery({ ...query, ...changes, page: changes.page ?? 1 }), { replace })
  }
  function retry() {
    setParams(writeTransactionQuery(query), { replace: true })
    reload()
  }
  function handleSaved(transaction: Transaction) {
    const next: TransactionQuery = {
      period: transaction.date.slice(0, 7),
      search: '',
      type: 'all',
      status: 'all',
      categoryId: 'all',
      page: 1,
    }
    setNotice({
      key: writeTransactionQuery(next).toString(),
      title: form?.kind === 'edit' ? 'Transação atualizada.' : 'Transação criada.',
    })
    setForm(null)
    focusAfterMutation.current = true
    setParams(writeTransactionQuery(next))
    reload()
  }
  function handleDeleted() {
    const page =
      state.status === 'success'
        ? Math.min(
            state.data.page,
            Math.max(1, Math.ceil((state.data.total - 1) / state.data.pageSize)),
          )
        : 1
    const next = { ...query, page }
    setDeleting(null)
    setNotice({ key: writeTransactionQuery(next).toString(), title: 'Transação excluída.' })
    focusAfterMutation.current = true
    setParams(writeTransactionQuery(next))
    reload()
  }
  return (
    <div className="transactions-page">
      <Card className="transactions-heading">
        <div className="min-w-0">
          <p className="text-label uppercase text-ink-secondary">
            Livro Caixa Acadêmico ·{' '}
            {query.period === 'all' ? 'Todo o período' : `Exercício ${query.period.slice(0, 4)}`}
          </p>
          <h1 ref={heading} tabIndex={-1} className="text-heading md:text-display">
            Transações Financeiras
          </h1>
          <p className="mt-space-sm text-ink-secondary">
            Registre, consulte e filtre suas movimentações financeiras.
          </p>
        </div>
        <div className="flex flex-wrap gap-space-sm">
          <Button variant="secondary" disabled={state.status === 'loading'} onClick={retry}>
            <Icon name="refresh" />
            Atualizar
          </Button>
          <Button disabled={state.status !== 'success'} onClick={() => setForm({ kind: 'create' })}>
            <Icon name="plus" />
            Nova Transação
          </Button>
        </div>
      </Card>
      {state.status === 'success' && (
        <div>
          <FinancialSummary summary={state.data.summary} variant="transactions" />
          <p className="mt-space-sm text-caption text-ink-secondary">
            Indicadores de todos os resultados filtrados, antes da paginação.{' '}
            {query.period === 'all' ? 'Todo o período.' : formatPeriod(query.period)} · Da data mais
            recente para a mais antiga.
          </p>
        </div>
      )}
      <TransactionFilters
        query={query}
        categories={categories}
        periods={periods}
        onChange={change}
        onReset={() =>
          change({ period: 'all', search: '', type: 'all', status: 'all', categoryId: 'all' })
        }
      />
      {notice?.key === queryKey && (
        <Feedback
          kind="success"
          title={notice.title}
          action={
            <Button variant="ghost" onClick={() => setNotice(null)}>
              Dispensar aviso
            </Button>
          }
        >
          Alterações salvas na sua conta. Após salvar, os filtros são redefinidos para o mês do
          lançamento; após excluir, os filtros ativos são preservados.
        </Feedback>
      )}
      {state.status === 'loading' && (
        <Feedback kind="loading" title="Carregando transações">
          Aplicando os filtros selecionados.
        </Feedback>
      )}
      {state.status === 'error' && (
        <Feedback
          kind="error"
          title="Não foi possível carregar as transações"
          action={
            <Button variant="secondary" onClick={retry}>
              Tentar novamente
            </Button>
          }
        >
          {state.message}
        </Feedback>
      )}
      {state.status === 'success' && (
        <>
          <TransactionTable
            data={state.data}
            onDetails={setDetails}
            onEdit={(transaction) => setForm({ kind: 'edit', transaction })}
            onDelete={setDeleting}
            onPage={(page) => change({ page })}
          />
        </>
      )}
      <p className="text-caption text-ink-secondary">
        Demonstração em memória. Recarregar reinicia os lançamentos fictícios.
      </p>
      <Modal
        title={form?.kind === 'edit' ? 'Editar Transação' : 'Registrar Nova Transação'}
        open={form !== null}
        onClose={() => setForm(null)}
      >
        {form && (
          <TransactionForm
            key={form.kind === 'edit' ? form.transaction.id : 'create'}
            scope={auth.user.email}
            categories={categories}
            period={month}
            defaultType={query.type === 'income' ? 'income' : 'expense'}
            initialTransaction={form.kind === 'edit' ? form.transaction : undefined}
            onSaved={handleSaved}
            onCancel={() => setForm(null)}
          />
        )}
      </Modal>
      <TransactionDetails transaction={details} onClose={() => setDetails(null)} />
      <DeleteTransactionDialog
        scope={auth.user.email}
        transaction={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={handleDeleted}
      />
    </div>
  )
}
