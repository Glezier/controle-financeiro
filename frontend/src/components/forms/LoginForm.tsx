import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useFormSubmission } from '../../hooks/useFormSubmission'
import { demoAccess } from '../../services/authService'
import { loginSchema } from '../../utils/authValidation'
import { Feedback } from '../feedback/Feedback'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { TextField } from './Field'
import { PasswordField } from './PasswordField'

export function LoginForm({ initialEmail }: { initialEmail?: string }) {
  const { signIn } = useAuth()
  const [values, setValues] = useState({
    email: initialEmail ?? demoAccess.email,
    password: initialEmail ? '' : demoAccess.password,
  })
  const { formRef, busy, errors, failure, submit } = useFormSubmission(loginSchema, signIn)
  return (
    <form
      ref={formRef}
      className="auth-form"
      noValidate
      aria-label="Entrar na conta"
      aria-busy={busy}
      onSubmit={(event) => {
        event.preventDefault()
        void submit(values)
      }}
    >
      {failure && (
        <Feedback kind="error" title="Não foi possível entrar">
          {failure}
        </Feedback>
      )}
      <fieldset disabled={busy} className="auth-fields">
        <TextField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          value={values.email}
          onChange={(event) => setValues({ ...values, email: event.target.value })}
          error={errors.email}
        />
        <PasswordField
          label="Senha"
          name="password"
          autoComplete="current-password"
          required
          maxLength={128}
          value={values.password}
          onChange={(event) => setValues({ ...values, password: event.target.value })}
          error={errors.password}
        />
      </fieldset>
      <p className="text-caption text-ink-secondary">
        Acesso fictício: {demoAccess.email} · senha {demoAccess.password}.
      </p>
      <Button type="submit" className="auth-submit" loading={busy}>
        {busy ? 'Acessando…' : 'Acessar Sistema'}
        {!busy && <Icon name="arrowRight" />}
      </Button>
      <Button
        variant="ghost"
        className="auth-simulate"
        disabled={busy}
        onClick={() => {
          void submit(values, true)
        }}
      >
        Simular erro de acesso
      </Button>
    </form>
  )
}
