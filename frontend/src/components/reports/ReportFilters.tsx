import { useRef, useState } from 'react'
import type { ReportQuery, ReportRange } from '../../types/reports'
import { isFinancialPeriod } from '../../utils/financeFormat'
import { TextField } from '../forms/Field'
import { Button } from '../ui/Button'

export function ReportFilters({
  query,
  onChange,
}: {
  query: ReportQuery
  onChange: (query: ReportQuery) => void
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [invalidPeriod, setInvalidPeriod] = useState<string | null>(null)
  function apply(range: ReportRange) {
    const form = formRef.current
    if (!form) return
    const period = String(new FormData(form).get('period') ?? '')
    if (!isFinancialPeriod(period)) {
      setInvalidPeriod(query.period)
      form.querySelector<HTMLInputElement>('input')?.focus()
      return
    }
    setInvalidPeriod(null)
    if (document.activeElement === form.querySelector('input'))
      form.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus()
    onChange({ period, range })
  }
  return (
    <form
      ref={formRef}
      className="report-filters"
      aria-label="Período do relatório"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        apply(query.range)
      }}
    >
      <div role="group" aria-label="Intervalo do relatório" className="report-range">
        {(
          [
            { value: 'month', label: 'Mês selecionado' },
            { value: 'quarter', label: 'Últimos 3 meses' },
            { value: 'year', label: 'Ano selecionado' },
          ] as const
        ).map((item) => (
          <Button
            key={item.value}
            variant={query.range === item.value ? 'primary' : 'ghost'}
            aria-pressed={query.range === item.value}
            onClick={() => apply(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <div className="report-month-control">
        <TextField
          key={query.period}
          label="Mês de referência"
          name="period"
          type="month"
          min="0001-01"
          max="9999-12"
          defaultValue={query.period}
          required
          error={invalidPeriod === query.period ? 'Informe um mês e ano válidos.' : undefined}
          onChange={() => setInvalidPeriod(null)}
        />
        <Button type="submit" variant="secondary">
          Aplicar período
        </Button>
      </div>
      <p className="text-caption text-ink-secondary">
        Três meses terminam no mês informado. Ano considera janeiro a dezembro.
      </p>
    </form>
  )
}
