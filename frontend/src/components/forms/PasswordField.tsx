import { useId, useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  error?: string
  hint?: string
}

export function PasswordField({ label, error, hint, id, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const descriptionId = `${fieldId}-description`
  return (
    <div className="ui-field">
      <label htmlFor={fieldId}>{label}</label>
      <div className="password-control">
        <input
          {...props}
          id={fieldId}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={
            [props['aria-describedby'], (error || hint) && descriptionId]
              .filter(Boolean)
              .join(' ') || undefined
          }
        />
        <Button
          variant="ghost"
          className="ui-icon-button password-toggle"
          disabled={props.disabled}
          aria-controls={fieldId}
          aria-pressed={visible}
          aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLocaleLowerCase('pt-BR')}`}
          onClick={() => setVisible((value) => !value)}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} />
        </Button>
      </div>
      {(error || hint) && (
        <p id={descriptionId} className={error ? 'ui-field-error' : 'ui-field-hint'}>
          {error || hint}
        </p>
      )}
    </div>
  )
}
