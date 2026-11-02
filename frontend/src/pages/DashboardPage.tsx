import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDashboard } from '../hooks/useDashboard'
import { currentFinancialPeriod } from '../utils/apiTransaction'
import { isApiPeriod } from '../services/apiReportService'
import type { TransactionView } from '../types/finance'
import {
  formatFinancialDate,
  formatMoney,
  formatPeriod,
} from '../utils/financeFormat'
import { ExpensesChart } from '../components/dashboard/ExpensesChart'
import { FinancialSummary } from '../components/dashboard/FinancialSummary'
import { RecentTransactions } from '../components/dashboard/RecentTransactions'
import { TransactionDetails } from '../components/transactions/TransactionDetails'
import { Feedback } from '../components/feedback/Feedback'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'

export function DashboardPage() {
  const { state: auth } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedPeriod = searchParams.get('period') ?? ''
  const period = isApiPeriod(requestedPeriod) ? requestedPeriod : currentFinancialPeriod()
  const user = auth.user
  const { state, reload } = useDashboard(
    user?.email ?? '',
    period,
    searchParams.get('cenario') === 'erro',
  )
  const navigate = useNavigate()
  const [details, setDetails] = useState<TransactionView | null>(null)
  useEffect(() => {
    document.title = 'Visão Geral | Controle Financeiro'
  }, [])
  if (!user) return null
  const periods = state.status === 'success' ? state.data.availablePeriods : [period]

  function retry() {
    setSearchParams(
      (previous) => {
        previous.delete('cenario')
        return previous
      },
      { replace: true },
    )
    reload()
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-heading">
        <div className="min-w-0">
          <p className="text-label uppercase text-ink-secondary">
            Gestão financeira / <span className="text-primary">Exercício {period.slice(0, 4)}</span>
          </p>
          <h1 className="text-heading dashboard-title">Olá, {user.name}</h1>
          <p className="text-caption text-ink-secondary">
            Acompanhe suas receitas, despesas e saldo no período selecionado.
          </p>
        </div>
        <div className="dashboard-actions">
          <div className="dashboard-period">
            <Icon name="calendar" />
            <label className="sr-only" htmlFor="dashboard-period">
              Selecione o período
            </label>
            <select
              id="dashboard-period"
              value={period}
              disabled={state.status !== 'success'}
              onChange={(event) => {
                setSearchParams({ period: event.target.value })
              }}
            >
              {periods.map((value) => (
                <option key={value} value={value}>
                  {formatPeriod(value)}
                </option>
              ))}
            </select>
          </div>
          <Button disabled={state.status !== 'success'} onClick={() => navigate('/transacoes?new=1')}>
            <Icon name="plus" />
            Nova Transação
          </Button>
        </div>
      </header>
      {state.status === 'loading' && (
        <>
          <Feedback kind="loading" title="Carregando visão geral">
            Preparando os indicadores do período.
          </Feedback>
          <div className="dashboard-summary" aria-hidden="true">
            {[0, 1, 2].map((item) => (
              <div key={item} className="dashboard-skeleton" />
            ))}
          </div>
        </>
      )}
      {state.status === 'error' && (
        <Card>
          <Feedback
            kind="error"
            title="Não foi possível carregar a visão geral"
            action={
              <Button variant="secondary" onClick={retry}>
                Tentar novamente
              </Button>
            }
          >
            {state.message}
          </Feedback>
        </Card>
      )}
      {state.status === 'success' && (
        <>
          <FinancialSummary summary={state.data.summary} />
          <div className="dashboard-pending">
            <div className="flex items-start gap-space-sm">
              <Icon name="clock" />
              <div>
                <p className="font-semibold">
                  Pendências do período: {state.data.summary.pendingCount}
                </p>
                <p className="text-caption text-ink-secondary">
                  Despesas:{' '}
                  <span className="financial-figure">
                    {formatMoney(state.data.summary.pendingExpenseCents)}
                  </span>{' '}
                  · Receitas:{' '}
                  <span className="financial-figure">
                    {formatMoney(state.data.summary.pendingIncomeCents)}
                  </span>{' '}
                  · Não afetam o saldo disponível.
                </p>
              </div>
            </div>
            {state.data.summary.nextPendingDate && (
              <p className="text-caption text-ink-secondary">
                Primeira data pendente:{' '}
                <time dateTime={state.data.summary.nextPendingDate}>
                  {formatFinancialDate(state.data.summary.nextPendingDate)}
                </time>
              </p>
            )}
          </div>
          <div className="dashboard-content-grid">
            <RecentTransactions
              transactions={state.data.recentTransactions}
              total={state.data.transactionCount}
              period={period}
              onDetails={setDetails}
            />
            <ExpensesChart
              items={state.data.expensesByCategory}
              totalCents={state.data.summary.expenseCents}
            />
          </div>
          <p className="text-caption text-ink-secondary">
            Indicadores calculados no banco sobre os lançamentos da sua conta e do período selecionado.
          </p>
        </>
      )}
      <TransactionDetails transaction={details} onClose={() => setDetails(null)} />
    </div>
  )
}
