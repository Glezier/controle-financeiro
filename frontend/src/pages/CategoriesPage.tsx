import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCategories } from '../hooks/useCategories'
import type { CategoryView } from '../types/finance'
import { CategoryForm } from '../components/forms/CategoryForm'
import { CategoryTable } from '../components/categories/CategoryTable'
import { DeleteCategoryDialog } from '../components/categories/DeleteCategoryDialog'
import { Feedback } from '../components/feedback/Feedback'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'

export function CategoriesPage() {
  const { state: auth } = useAuth()
  const [params, setParams] = useSearchParams()
  const { state, reload } = useCategories(auth.user?.email ?? '', params.get('cenario') === 'erro')
  const [form, setForm] = useState<{
    category: CategoryView | null
    revision: number
    focus: boolean
  }>({ category: null, revision: 0, focus: false })
  const [deleting, setDeleting] = useState<CategoryView | null>(null)
  const [notice, setNotice] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const focusAfterMutation = useRef(false)
  useEffect(() => {
    document.title = 'Categorias | Controle Financeiro'
  }, [])
  useEffect(() => {
    if (state.status === 'success' && focusAfterMutation.current) {
      focusAfterMutation.current = false
      heading.current?.focus()
    }
  }, [state])
  if (!auth.user) return null
  function reset(focus: boolean) {
    setForm((previous) => ({ category: null, revision: previous.revision + 1, focus }))
  }
  function edited(category: CategoryView) {
    setNotice('')
    setForm((previous) => ({ category, revision: previous.revision + 1, focus: true }))
  }
  function updated(message: string) {
    reset(false)
    setDeleting(null)
    setNotice(message)
    focusAfterMutation.current = true
    reload()
  }
  function retry() {
    const next = new URLSearchParams(params)
    next.delete('cenario')
    setParams(next, { replace: true })
    reload()
  }
  return (
    <div className="categories-page">
      <div className="categories-heading">
        <div>
          <p className="text-label uppercase text-primary">Configurações · Classificação</p>
          <h1 ref={heading} tabIndex={-1} className="text-heading md:text-display">
            Categorias
          </h1>
          <p className="mt-space-sm text-ink-secondary">
            Organize seus gastos e receitas em grupos personalizados.
          </p>
        </div>
        <Button
          disabled={state.status !== 'success'}
          onClick={() => {
            setNotice('')
            reset(true)
          }}
        >
          <Icon name="plus" />
          Nova Categoria
        </Button>
      </div>
      {notice && (
        <Feedback
          kind="success"
          title={notice}
          action={
            <Button variant="ghost" onClick={() => setNotice('')}>
              Dispensar aviso
            </Button>
          }
        >
          As alterações foram salvas na sua conta.
        </Feedback>
      )}
      {state.status === 'loading' && (
        <Feedback kind="loading" title="Carregando categorias">
          Consultando categorias e seus vínculos.
        </Feedback>
      )}
      {state.status === 'error' && (
        <Feedback
          kind="error"
          title="Não foi possível carregar as categorias"
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
          <div className="categories-insights">
            <Card className="category-total">
              <div>
                <h2 className="text-label uppercase text-ink-secondary">Total de Categorias</h2>
                <p>
                  <strong className="text-metric financial-figure">{state.data.total}</strong>{' '}
                  cadastradas na sua conta
                </p>
                <p className="text-caption text-ink-secondary">
                  {state.data.incomeCount} de receita · {state.data.expenseCount} de despesa
                </p>
              </div>
              <span className="category-symbol">
                <Icon name="categories" />
              </span>
            </Card>
            <Feedback kind="info" title="Regra de Integridade do Sistema">
              Categorias em uso não podem ser excluídas nem mudar de tipo. Renomear mantém os
              vínculos e atualiza a identificação dos lançamentos.
            </Feedback>
          </div>
          <div className="categories-workspace">
            <div className="space-y-space-md">
              <CategoryTable
                data={state.data}
                onEdit={edited}
                onDelete={(category) => {
                  if (category.transactionCount === 0) setDeleting(category)
                }}
              />
              <Card>
                <p className="flex items-start gap-space-sm">
                  <Icon name="school" />
                  <span>
                    <strong>Ambiente Acadêmico:</strong> organize bolsas, material de estudo e
                    despesas diárias com categorias próprias.
                  </span>
                </p>
              </Card>
            </div>
            <CategoryForm
              key={form.revision}
              scope={auth.user.email}
              category={form.category}
              focusOnMount={form.focus}
              onSaved={() => updated(form.category ? 'Categoria atualizada.' : 'Categoria criada.')}
              onCancel={() => reset(true)}
            />
          </div>
        </>
      )}
      <p className="text-caption text-ink-secondary">
        Categorias salvas no banco de dados e vinculadas à sua conta.
      </p>
      <DeleteCategoryDialog
        scope={auth.user.email}
        category={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => updated('Categoria excluída.')}
      />
    </div>
  )
}
