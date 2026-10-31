import { useEffect, useRef, useState } from 'react'
import type { Category, CategoryDraft, CategoryView } from '../../types/finance'
import { categoryService } from '../../services/categoryService'
import {
  categoryColors,
  categoryFieldErrors,
  categoryIcons,
  categorySchema,
} from '../../utils/categoryValidation'
import { Feedback } from '../feedback/Feedback'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'
import { SelectField, TextField } from './Field'

export function CategoryForm({
  scope,
  category,
  focusOnMount,
  onSaved,
  onCancel,
}: {
  scope: string
  category: CategoryView | null
  focusOnMount: boolean
  onSaved: (category: Category) => void
  onCancel: () => void
}) {
  const [values, setValues] = useState<CategoryDraft>({
    name: category?.name ?? '',
    type: category?.type ?? 'expense',
    description: category?.appearance?.description ?? '',
    color: category?.appearance?.color ?? categoryColors[0].value,
    icon: category?.appearance?.icon ?? 'home',
  })
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [failure, setFailure] = useState('')
  const controller = useRef<AbortController | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => {
    if (focusOnMount)
      formRef.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus()
  }, [focusOnMount])
  useEffect(() => {
    if (Object.keys(errors).length)
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [errors])
  const inUse = (category?.transactionCount ?? 0) > 0
  async function submit() {
    if (controller.current) return
    setFailure('')
    const parsed = categorySchema.safeParse(values)
    if (!parsed.success) {
      setErrors(categoryFieldErrors(parsed.error.issues))
      return
    }
    setErrors({})
    const request = new AbortController()
    controller.current = request
    setBusy(true)
    try {
      const result = category
        ? await categoryService.updateCategory(scope, category.id, parsed.data, {
            signal: request.signal,
          })
        : await categoryService.createCategory(scope, parsed.data, { signal: request.signal })
      if (request.signal.aborted) return
      if (result.ok) onSaved(result.data)
      else {
        setFailure(result.error.message)
        if (result.error.fields) setErrors(result.error.fields)
      }
    } catch {
      if (!request.signal.aborted)
        setFailure('Não foi possível salvar a categoria. Tente novamente.')
    } finally {
      controller.current = null
      if (!request.signal.aborted) setBusy(false)
    }
  }
  return (
    <Card className="category-form-card">
      <div className="category-panel-heading">
        <h2 className="text-subheading">
          <Icon name={category ? 'edit' : 'plus'} />
          {category ? 'Editar Categoria' : 'Adicionar Categoria'}
        </h2>
        <Badge>{category ? 'Edição' : 'Novo'}</Badge>
      </div>
      <form
        ref={formRef}
        aria-label={category ? 'Editar categoria' : 'Adicionar categoria'}
        className="category-form"
        aria-busy={busy}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        {failure && (
          <Feedback kind="error" title="Categoria não salva">
            {failure}
          </Feedback>
        )}
        <fieldset disabled={busy} className="category-form-fields">
          <TextField
            label="Nome da Categoria"
            name="name"
            value={values.name}
            maxLength={80}
            required
            placeholder="Ex.: Educação e livros"
            error={errors.name}
            onChange={(event) => setValues({ ...values, name: event.target.value })}
          />
          <SelectField
            label="Tipo"
            name="type"
            value={values.type}
            required
            disabled={inUse}
            error={errors.type}
            hint={
              inUse ? 'Tipo bloqueado: esta categoria possui transações vinculadas.' : undefined
            }
            onChange={(event) =>
              setValues({ ...values, type: event.target.value as CategoryDraft['type'] })
            }
          >
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </SelectField>
          <TextField
            label="Descrição visual (opcional)"
            name="description"
            value={values.description}
            maxLength={160}
            placeholder="Ex.: Material, cursos e bibliografia"
            error={errors.description}
            onChange={(event) => setValues({ ...values, description: event.target.value })}
          />
          <SelectField
            label="Ícone de identificação"
            name="icon"
            value={values.icon}
            required
            error={errors.icon}
            onChange={(event) =>
              setValues({ ...values, icon: event.target.value as CategoryDraft['icon'] })
            }
          >
            {categoryIcons.map((icon) => (
              <option key={icon.value} value={icon.value}>
                {icon.label}
              </option>
            ))}
          </SelectField>
          <fieldset className="category-colors">
            <legend>Cor de identificação</legend>
            <div>
              {categoryColors.map((color) => (
                <label key={color.value} className="category-color" title={color.label}>
                  <input
                    className="sr-only"
                    type="radio"
                    name="color"
                    value={color.value}
                    checked={values.color === color.value}
                    onChange={() => setValues({ ...values, color: color.value })}
                  />
                  <span style={{ backgroundColor: color.value }} />
                  <span className="sr-only">{color.label}</span>
                </label>
              ))}
            </div>
            {errors.color && (
              <p role="alert" className="ui-field-error">
                {errors.color}
              </p>
            )}
          </fieldset>
          <p className="text-caption text-ink-secondary">
            Descrição, ícone e cor são apenas recursos visuais desta demonstração.
          </p>
        </fieldset>
        <div className="category-form-actions">
          <Button type="submit" loading={busy}>
            <Icon name="check" />
            {busy ? 'Salvando…' : category ? 'Atualizar Categoria' : 'Salvar Categoria'}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            {category || busy ? 'Cancelar' : 'Limpar'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
