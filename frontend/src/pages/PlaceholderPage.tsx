import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Feedback } from '../components/feedback/Feedback'

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    document.title = `${title} | Controle Financeiro`
  }, [title])
  return (
    <div className="space-y-space-lg">
      <div>
        <p className="mb-space-sm text-label text-primary uppercase">Controle Financeiro</p>
        <h1 className="text-heading md:text-display">{title}</h1>
        <p className="mt-space-sm text-ink-secondary">{description}</p>
      </div>
      <Card>
        <Feedback title="Página em preparação">
          A estrutura de navegação está disponível. O conteúdo desta página será implementado em uma
          próxima etapa.
        </Feedback>
        <Link className="mt-space-lg inline-block underline" to="/componentes">
          Conferir a amostra de componentes
        </Link>
      </Card>
    </div>
  )
}
