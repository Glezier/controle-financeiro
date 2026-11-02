import type { CategorySnapshot, CategoryView } from '../../types/finance'
import { Feedback } from '../feedback/Feedback'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { DataTable } from '../ui/DataTable'
import { Icon } from '../ui/Icon'

export function CategoryTable({
  data,
  onEdit,
  onDelete,
}: {
  data: CategorySnapshot
  onEdit: (category: CategoryView) => void
  onDelete: (category: CategoryView) => void
}) {
  return (
    <Card className="category-table">
      <div className="category-panel-heading">
        <h2 className="text-subheading">
          <Icon name="categories" />
          Categorias Existentes
        </h2>
        <Badge>
          {data.total} {data.total === 1 ? 'registro' : 'registros'}
        </Badge>
      </div>
      {data.items.length === 0 ? (
        <div className="p-space-lg">
          <Feedback kind="empty" title="Nenhuma categoria cadastrada">
            Adicione uma categoria de receita ou despesa para organizar seus lançamentos.
          </Feedback>
        </div>
      ) : (
        <DataTable caption="Categorias e quantidade de transações vinculadas">
          <thead>
            <tr>
              <th scope="col">Ícone e nome</th>
              <th scope="col">Tipo</th>
              <th scope="col">Transações</th>
              <th scope="col">Ações</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((category) => (
              <tr key={category.id}>
                <th scope="row">
                  <div className="category-name-cell">
                    <span
                      className="category-symbol"
                      style={{ color: category.appearance?.color ?? 'var(--color-primary)' }}
                    >
                      <Icon name={category.appearance?.icon ?? 'categories'} />
                    </span>
                    <div>
                      <span className="category-name">{category.name}</span>
                      {category.appearance?.description && (
                        <p className="category-description">{category.appearance.description}</p>
                      )}
                    </div>
                  </div>
                </th>
                <td>
                  <Badge tone={category.type}>
                    {category.type === 'income' ? 'Receita' : 'Despesa'}
                  </Badge>
                </td>
                <td>
                  <p className="financial-figure">
                    {category.transactionCount}{' '}
                    {category.transactionCount === 1 ? 'transação' : 'transações'}
                  </p>
                  <p id={`usage-${category.id}`} className="text-caption text-ink-secondary">
                    {category.transactionCount > 0 ? 'Em uso: exclusão bloqueada' : 'Sem vínculos'}
                  </p>
                </td>
                <td>
                  <div className="category-row-actions">
                    <Button
                      variant="ghost"
                      className="ui-icon-button"
                      aria-label={`Editar ${category.name}`}
                      onClick={() => onEdit(category)}
                    >
                      <Icon name="edit" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="ui-icon-button category-delete-action"
                      aria-label={`Excluir ${category.name}`}
                      disabled={category.transactionCount > 0}
                      aria-describedby={`usage-${category.id}`}
                      title={
                        category.transactionCount > 0
                          ? 'Exclusão bloqueada: categoria em uso.'
                          : `Excluir ${category.name}`
                      }
                      onClick={() => onDelete(category)}
                    >
                      <Icon name="trash" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      <p className="category-table-note text-caption text-ink-secondary">
        Todos os meses e situações são considerados nos vínculos. Ordem alfabética.
      </p>
    </Card>
  )
}
