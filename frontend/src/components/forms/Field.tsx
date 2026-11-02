import { useId } from 'react'
import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'

type FieldInfo = { label: string; hint?: string; error?: string }

export function TextField({
  label,
  hint,
  error,
  id,
  ...props
}: FieldInfo & InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const descriptionId = `${fieldId}-description`
  return (
    <div className="ui-field">
      <label htmlFor={fieldId}>{label}</label>
      <input
        {...props}
        id={fieldId}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={
          [props['aria-describedby'], (error || hint) && descriptionId].filter(Boolean).join(' ') ||
          undefined
        }
      />
      {(error || hint) && (
        <p id={descriptionId} className={error ? 'ui-field-error' : 'ui-field-hint'}>
          {error || hint}
        </p>
      )}
    </div>
  )
}

export function SelectField({
  label,
  hint,
  error,
  id,
  children,
  ...props
}: FieldInfo & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const descriptionId = `${fieldId}-description`
  return (
    <div className="ui-field">
      <label htmlFor={fieldId}>{label}</label>
      <select
        {...props}
        id={fieldId}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={
          [props['aria-describedby'], (error || hint) && descriptionId].filter(Boolean).join(' ') ||
          undefined
        }
      >
        {children}
      </select>
      {(error || hint) && (
        <p id={descriptionId} className={error ? 'ui-field-error' : 'ui-field-hint'}>
          {error || hint}
        </p>
      )}
    </div>
  )
}
