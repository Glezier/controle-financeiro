import { useId, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useFormSubmission } from '../../hooks/useFormSubmission'
import type { UserProfile } from '../../types/profile'
import { registrationSchema } from '../../utils/authValidation'
import { Feedback } from '../feedback/Feedback'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { TextField } from './Field'
import { PasswordField } from './PasswordField'

export function RegisterForm({ onSuccess }: { onSuccess: (user: UserProfile) => void }) {
  const { signUp } = useAuth()
  const consentId = useId()
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptedDemo: false,
  })
  const { formRef, busy, errors, failure, submit } = useFormSubmission(
    registrationSchema,
    signUp,
    onSuccess,
  )
  return (
    <form
      ref={formRef}
      className="auth-form"
      noValidate
      aria-label="Criar conta"
      aria-busy={busy}
      onSubmit={(event) => {
        event.preventDefault()
        void submit(values)
      }}
    >
      {failure && (
        <Feedback kind="error" title="Não foi possível cadastrar">
          {failure}
        </Feedback>
      )}
      <fieldset disabled={busy} className="auth-fields">
        <TextField
          label="Nome completo"
          name="name"
          autoComplete="name"
          required
          maxLength={100}
          placeholder="Seu nome"
          value={values.name}
          onChange={(event) => setValues({ ...values, name: event.target.value })}
          error={errors.name}
        />
        <TextField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          placeholder="seu.email@exemplo.com"
          value={values.email}
          onChange={(event) => setValues({ ...values, email: event.target.value })}
          error={errors.email}
        />
        <PasswordField
          label="Senha"
          name="password"
          autoComplete="new-password"
          required
          maxLength={128}
          placeholder="Mínimo de 8 caracteres"
          value={values.password}
          onChange={(event) => setValues({ ...values, password: event.target.value })}
          error={errors.password}
        />
        <PasswordField
          label="Confirmar senha"
          name="confirmPassword"
          autoComplete="new-password"
          required
          maxLength={128}
          placeholder="Repita a senha criada"
          value={values.confirmPassword}
          onChange={(event) => setValues({ ...values, confirmPassword: event.target.value })}
          error={errors.confirmPassword}
        />
        <div>
          <label className="auth-consent" htmlFor={consentId}>
            <input
              id={consentId}
              type="checkbox"
              name="acceptedDemo"
              checked={values.acceptedDemo}
              onChange={(event) => setValues({ ...values, acceptedDemo: event.target.checked })}
              aria-invalid={errors.acceptedDemo ? true : undefined}
              aria-describedby={errors.acceptedDemo ? `${consentId}-error` : undefined}
              required
            />
            <span>
              Entendo que este é um ambiente acadêmico de demonstração, com dados fictícios.
            </span>
          </label>
          {errors.acceptedDemo && (
            <p className="ui-field-error mt-space-xs" id={`${consentId}-error`}>
              {errors.acceptedDemo}
            </p>
          )}
        </div>
      </fieldset>
      <Button type="submit" className="auth-submit" loading={busy}>
        {busy ? 'Criando conta…' : 'Criar Minha Conta'}
        {!busy && <Icon name="check" />}
      </Button>
    </form>
  )
}
