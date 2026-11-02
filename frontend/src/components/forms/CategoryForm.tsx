import { useFormSubmission } from '../../hooks/useFormSubmission'
import { useEffect, useState } from 'react'
import type { Category, CategoryView } from '../../types/finance'
import { categoryService } from '../../services/categoryService'
import { apiCategoryIcons, apiCategoryIconSchema, apiCategoryInputSchema } from '../../utils/apiCategory'
import type { ApiCategoryInput } from '../../utils/apiCategory'
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
  const [values, setValues] = useState<ApiCategoryInput>({
    name: category?.name ?? '',
    type: category?.type ?? 'expense',
    icon: apiCategoryIconSchema.safeParse(category?.apiIcon).data ?? 'category',
  })
  const { formRef, busy, errors, failure, submit } = useFormSubmission(
    apiCategoryInputSchema,
    (input, options) =>
      category
        ? categoryService.updateCategory(scope, category.id, input, options)
        : categoryService.createCategory(scope, input, options),
    onSaved,
    'Não foi possível salvar a categoria. Tente novamente.',
  )
  useEffect(() => {
    if (focusOnMount)
      formRef.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus()
  }, [focusOnMount, formRef])
  const inUse = (category?.transactionCount ?? 0) > 0

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
          void submit(values)
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
              setValues({ ...values, type: event.target.value as ApiCategoryInput['type'] })
            }
          >
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </SelectField>
          <SelectField
            label="Ícone de identificação"
            name="icon"
            value={values.icon}
            required
            error={errors.icon}
            onChange={(event) =>
              setValues({ ...values, icon: event.target.value as ApiCategoryInput['icon'] })
            }
          >
            {apiCategoryIcons.map((icon) => (
              <option key={icon.value} value={icon.value}>
                {icon.label}
              </option>
            ))}
          </SelectField>
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
