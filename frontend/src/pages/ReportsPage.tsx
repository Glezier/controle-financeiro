import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useReport } from '../hooks/useReport'
import { currentFinancialPeriod } from '../utils/apiTransaction'
import {
  readReportQuery,
  reportPeriodLabel,
  reportPeriods,
  writeReportQuery,
} from '../utils/reportPeriods'
import { formatMoney } from '../utils/financeFormat'
import { FinancialSummary } from '../components/dashboard/FinancialSummary'
import { ExpensesChart } from '../components/dashboard/ExpensesChart'
import { MonthlyEvolutionChart } from '../components/reports/MonthlyEvolutionChart'
import { ReportFilters } from '../components/reports/ReportFilters'
import { Feedback } from '../components/feedback/Feedback'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'

export function ReportsPage() {
  const { state: auth } = useAuth()
  const [params, setParams] = useSearchParams()
  const query = readReportQuery(params, currentFinancialPeriod())
  const { state, reload } = useReport(
    auth.user?.email ?? '',
    query,
    params.get('cenario') === 'erro',
  )
  const periods = reportPeriods(query)
  const label = reportPeriodLabel(periods.start, periods.end)
  useEffect(() => {
    document.title = 'Relatórios | Controle Financeiro'
  }, [])
  function retry() {
    setParams(writeReportQuery(query), { replace: true })
    reload()
  }
  return (
    <div className="reports-page">
      <Card className="reports-heading">
        <div>
          <p className="text-label uppercase text-primary">
            Métricas consolidadas · Sua conta
          </p>
          <h1 className="text-heading md:text-display">Relatórios Financeiros</h1>
          <p className="mt-space-sm text-ink-secondary">
            Análise visual de receitas e despesas por período.
          </p>
        </div>
        <ReportFilters query={query} onChange={(value) => setParams(writeReportQuery(value))} />
      </Card>
      <p className="text-caption text-ink-secondary">
        Período dos indicadores e categorias: <strong>{label}</strong>.
      </p>
      {state.status === 'loading' && (
        <Feedback kind="loading" title="Calculando relatório">
          Consolidando os lançamentos do período selecionado.
        </Feedback>
      )}
      {state.status === 'error' && (
        <Feedback
          kind="error"
          title="Não foi possível carregar o relatório"
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
          {state.data.transactionCount === 0 && (
            <Feedback kind="empty" title="Sem lançamentos no período selecionado">
              Os indicadores e a distribuição estão zerados. O gráfico mensal pode incluir meses
              anteriores como contexto.
            </Feedback>
          )}
          <FinancialSummary summary={state.data.summary} variant="report" />
          {query.range === 'month' && (
            <p className="text-caption text-ink-secondary">
              Contexto do gráfico: mês selecionado e até três meses anteriores. Os indicadores acima
              e as categorias abaixo se referem somente a {label}.
            </p>
          )}
          <div className="reports-charts">
            <MonthlyEvolutionChart months={state.data.months} selectedPeriod={query.period} />
            <ExpensesChart
              items={state.data.expensesByCategory}
              totalCents={state.data.summary.expenseCents}
              title="Distribuição de Despesas"
            />
          </div>
          <div className="reports-insights">
            <Card>
              <h2 className="text-subheading flex items-center gap-space-sm">
                <Icon name="wallet" />
                Resultado do período
              </h2>
              <p className="mt-space-md">
                {state.data.resultRate === null ? (
                  'Taxa de resultado indisponível: não há receitas efetivadas no período.'
                ) : (
                  <>
                    <strong className="financial-figure">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'percent',
                        maximumFractionDigits: 1,
                      }).format(state.data.resultRate)}
                    </strong>{' '}
                    das receitas efetivadas correspondem ao resultado líquido.
                  </>
                )}
              </p>
              <p className="mt-space-sm text-caption text-ink-secondary">
                Resultado = receitas menos despesas efetivadas. Taxa = resultado dividido pelas
                receitas; pode ser negativa.
              </p>
            </Card>
            <Card>
              <h2 className="text-subheading flex items-center gap-space-sm">
                <Icon name="clock" />
                Pendências fora dos indicadores
              </h2>
              <p className="mt-space-md">
                Receitas pendentes:{' '}
                <strong className="financial-figure">
                  {formatMoney(state.data.summary.pendingIncomeCents)}
                </strong>
                .
              </p>
              <p>
                Despesas pendentes:{' '}
                <strong className="financial-figure">
                  {formatMoney(state.data.summary.pendingExpenseCents)}
                </strong>
                .
              </p>
              <p className="mt-space-sm text-caption text-ink-secondary">
                {state.data.summary.pendingCount}{' '}
                {state.data.summary.pendingCount === 1 ? 'pendência' : 'pendências'} no período.
                Pendências não entram nos totais efetivados nem nos gráficos.
              </p>
            </Card>
          </div>
        </>
      )}
      <Feedback kind="info" title="Regra de cálculo">
        Relatórios calculados no banco sobre receitas e despesas efetivadas da sua conta.
        Pendências são apresentadas separadamente.
      </Feedback>
    </div>
  )
}
