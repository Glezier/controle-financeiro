import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  variant?: 'dialog' | 'drawer'
  id?: string
}

export function Modal({ open, onClose, title, children, variant = 'dialog', id }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  return (
    <dialog
      id={id}
      ref={ref}
      className={`ui-modal ui-modal--${variant}`}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0)
        const first = controls[0]
        const last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose()
      }}
    >
      <div className="ui-modal-header">
        <h2 id={titleId} className="text-subheading">
          {title}
        </h2>
        <Button
          variant="ghost"
          className="ui-icon-button"
          aria-label={`Fechar ${title.toLocaleLowerCase('pt-BR')}`}
          onClick={onClose}
        >
          <Icon name="close" />
        </Button>
      </div>
      <div className="ui-modal-body">{children}</div>
    </dialog>
  )
}
