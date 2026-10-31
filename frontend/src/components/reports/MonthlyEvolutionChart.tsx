import { useEffect, useId, useRef } from 'react'
import type { MonthlyReport } from '../../types/reports'
import { formatMoney, formatPeriod } from '../../utils/financeFormat'
import { reportPeriodLabel } from '../../utils/reportPeriods'
import { Feedback } from '../feedback/Feedback'
import { Card } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { Icon } from '../ui/Icon'

export function MonthlyEvolutionChart({
  months,
  selectedPeriod,
}: {
  months: MonthlyReport[]
  selectedPeriod: string
}) {
  const id = useId()
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const region = scrollRef.current
    if (!region || months.length > 4) return
    const observer = new ResizeObserver(() => {
      region.scrollLeft = region.scrollWidth - region.clientWidth
    })
    observer.observe(region)
    return () => observer.disconnect()
  }, [months])
  const maximum = Math.max(0, ...months.flatMap((item) => [item.incomeCents, item.expenseCents]))
  const magnitude = maximum > 0 ? 10 ** Math.floor(Math.log10(maximum / 4)) : 1000
  const step = Math.max(1, Math.ceil(maximum / 4 / magnitude) * magnitude)
  const scale = maximum > 0 ? step * 4 : 10000
  const width = Math.max(430, months.length * 70 + 90)
  const left = 80,
    top = 24,
    height = 200,
    bottom = top + height,
    plotWidth = width - left - 16
  const groupWidth = plotWidth / months.length
  const compactMoney = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  })
  return (
    <Card className="report-evolution">
      <div className="dashboard-panel-heading">
        <h2>
          <Icon name="reports" />
          Evolução Mensal
        </h2>
      </div>
      <p className="text-caption text-ink-secondary">
        Receitas e despesas efetivadas ·{' '}
        {reportPeriodLabel(months[0].period, months.at(-1)!.period)}
      </p>
      <div className="report-chart-key">
        <span>
          <i className="report-key-income" aria-hidden="true" />
          Receitas
        </span>
        <span>
          <i className="report-key-expense" aria-hidden="true" />
          Despesas
        </span>
      </div>
      {maximum === 0 ? (
        <Feedback kind="empty" title="Sem movimentações efetivadas no gráfico">
          Os meses sem receitas ou despesas efetivadas permanecem zerados na tabela.
        </Feedback>
      ) : (
        <figure>
          <div
            className="report-chart-scroll"
            ref={scrollRef}
            role="region"
            aria-label="Gráfico de evolução mensal com rolagem horizontal"
            tabIndex={0}
          >
            <svg
              viewBox={`0 0 ${width} 280`}
              width={width}
              height="280"
              style={{ minWidth: width }}
              role="img"
              aria-labelledby={`${id}-title ${id}-description`}
            >
              <title id={`${id}-title`}>Receitas e despesas efetivadas por mês</title>
              <desc id={`${id}-description`}>
                Comparativo mensal. Os valores exatos e o resultado de cada mês estão na tabela Ver
                valores mensais.
              </desc>
              {Array.from({ length: 5 }, (_, index) => {
                const value = (scale * index) / 4
                const y = bottom - (height * index) / 4
                return (
                  <g key={index}>
                    <line
                      x1={left}
                      x2={width - 16}
                      y1={y}
                      y2={y}
                      stroke="var(--color-border-subtle)"
                    />
                    <text x={left - 8} y={y + 4} textAnchor="end" className="report-axis">
                      {scale < 100000 ? formatMoney(value) : compactMoney.format(value / 100)}
                    </text>
                  </g>
                )
              })}
              {months.map((item, index) => {
                const center = left + groupWidth * (index + 0.5)
                const barWidth = Math.min(24, groupWidth * 0.28)
                return (
                  <g key={item.period}>
                    <rect
                      x={center - barWidth - 2}
                      y={bottom - (item.incomeCents / scale) * height}
                      width={barWidth}
                      height={(item.incomeCents / scale) * height}
                      rx="2"
                      fill="var(--color-income)"
                    >
                      <title>
                        {formatPeriod(item.period)}: receitas {formatMoney(item.incomeCents)}
                      </title>
                    </rect>
                    <rect
                      x={center + 2}
                      y={bottom - (item.expenseCents / scale) * height}
                      width={barWidth}
                      height={(item.expenseCents / scale) * height}
                      rx="2"
                      fill="var(--color-expense)"
                    >
                      <title>
                        {formatPeriod(item.period)}: despesas {formatMoney(item.expenseCents)}
                      </title>
                    </rect>
                    <text
                      x={center}
                      y={bottom + 22}
                      textAnchor="middle"
                      className={
                        item.period === selectedPeriod
                          ? 'report-axis report-axis--selected'
                          : 'report-axis'
                      }
                    >
                      {new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' }).format(
                        new Date(`${item.period}-01T12:00:00Z`),
                      )}
                    </text>
                    <text x={center} y={bottom + 38} textAnchor="middle" className="report-axis">
                      {item.period.slice(0, 4)}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
          <figcaption className="text-caption text-ink-secondary">
            Valores em reais. Verde: receitas; vermelho: despesas. Consulte os valores exatos
            abaixo. Role o gráfico horizontalmente quando necessário ou abra a tabela de valores.
          </figcaption>
        </figure>
      )}
      <details className="report-values">
        <summary>Ver valores mensais</summary>
        <DataTable caption="Valores mensais de receitas, despesas e resultado">
          <thead>
            <tr>
              <th scope="col">Mês</th>
              <th scope="col" className="amount-cell">
                Receitas
              </th>
              <th scope="col" className="amount-cell">
                Despesas
              </th>
              <th scope="col" className="amount-cell">
                Resultado
              </th>
            </tr>
          </thead>
          <tbody>
            {months.map((item) => (
              <tr key={item.period}>
                <th scope="row">{formatPeriod(item.period)}</th>
                <td className="amount-cell text-income">{formatMoney(item.incomeCents)}</td>
                <td className="amount-cell text-expense">{formatMoney(item.expenseCents)}</td>
                <td className="amount-cell">{formatMoney(item.balanceCents)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </details>
    </Card>
  )
}
