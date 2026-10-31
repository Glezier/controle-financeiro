import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Feedback } from '../components/feedback/Feedback'

export function NotFoundPage() {
  useEffect(() => {
    document.title = 'Página não encontrada | Controle Financeiro'
  }, [])
  return (
    <div className="space-y-space-lg">
      <div>
        <p className="mb-space-sm text-label text-primary uppercase">Controle Financeiro</p>
        <h1 className="text-heading md:text-display">Página não encontrada</h1>
        <p className="mt-space-sm text-ink-secondary">O endereço solicitado não está disponível.</p>
      </div>
      <Card>
        <Feedback title="Confira o endereço ou continue pelo menu">
          Você pode voltar à Visão Geral para consultar seus lançamentos e indicadores.
        </Feedback>
        <Link className="mt-space-lg inline-block underline" to="/visao-geral">
          Ir para Visão Geral
        </Link>
      </Card>
    </div>
  )
}
