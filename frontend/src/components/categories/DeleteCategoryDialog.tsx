import { useEffect, useRef, useState } from 'react'
import { categoryService } from '../../services/categoryService'
import type { CategoryView } from '../../types/finance'
import { Feedback } from '../feedback/Feedback'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

type Props = {
  scope: string
  category: CategoryView | null
  onClose: () => void
  onDeleted: () => void
}
function Confirmation({
  scope,
  category,
  onClose,
  onDeleted,
}: Omit<Props, 'category'> & { category: CategoryView }) {
  const controller = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const [blocked, setBlocked] = useState(category.transactionCount > 0)
  useEffect(() => () => controller.current?.abort(), [])
  async function confirm() {
    if (controller.current || blocked) return
    const request = new AbortController()
    controller.current = request
    setBusy(true)
    setFailure('')
    try {
      const result = await categoryService.deleteCategory(scope, category.id, {
        signal: request.signal,
      })
      if (request.signal.aborted) return
      if (result.ok) onDeleted()
      else {
        setFailure(result.error.message)
        if (result.error.code === 'in_use' || result.error.code === 'not_found') setBlocked(true)
      }
    } catch {
      if (!request.signal.aborted)
        setFailure('Não foi possível excluir a categoria. Tente novamente.')
    } finally {
      controller.current = null
      if (!request.signal.aborted) setBusy(false)
    }
  }
  return (
    <div className="space-y-space-md" aria-busy={busy}>
      <p>
        Excluir a categoria <strong className="break-words">{category.name}</strong>?
      </p>
      <p>
        Somente categorias sem transações vinculadas podem ser excluídas. Esta alteração afeta
        apenas a demonstração em memória.
      </p>
      {failure && (
        <Feedback kind="error" title="Categoria não excluída">
          {failure}
        </Feedback>
      )}
      {blocked && !failure && (
        <Feedback kind="info" title="Categoria em uso">
          A exclusão está bloqueada.
        </Feedback>
      )}
      <div className="category-form-actions">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          disabled={blocked}
          loading={busy}
          onClick={() => {
            void confirm()
          }}
        >
          {busy ? 'Excluindo…' : 'Confirmar Exclusão'}
        </Button>
      </div>
    </div>
  )
}
export function DeleteCategoryDialog(props: Props) {
  return (
    <Modal title="Excluir categoria" open={props.category !== null} onClose={props.onClose}>
      {props.category && (
        <Confirmation key={props.category.id} {...props} category={props.category} />
      )}
    </Modal>
  )
}
