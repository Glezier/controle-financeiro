import { useEffect, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LoginForm } from '../components/forms/LoginForm'
import { RegisterForm } from '../components/forms/RegisterForm'
import { Feedback } from '../components/feedback/Feedback'
import { Icon } from '../components/ui/Icon'
import { authReturnPath } from '../utils/authValidation'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const previousMode = useRef(mode)
  const state: Record<string, unknown> =
    location.state && typeof location.state === 'object' ? location.state : {}
  const from = authReturnPath(state.from)
  const registered = mode === 'login' && state.registered === true
  const initialEmail = typeof state.email === 'string' ? state.email : undefined
  useEffect(() => {
    document.title = `${mode === 'login' ? 'Entrar' : 'Criar conta'} | Controle Financeiro`
    if (previousMode.current !== mode) {
      titleRef.current?.focus()
      previousMode.current = mode
    }
  }, [mode])
  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-content">
          <header className="auth-heading">
            <span className="auth-logo">
              <Icon name="wallet" />
            </span>
            <h1 ref={titleRef} tabIndex={-1} className="text-heading">
              Controle Financeiro
            </h1>
            <p className="mt-space-xs text-caption text-ink-secondary">
              Gestão financeira pessoal simples e descomplicada.
            </p>
          </header>
          <nav className="auth-tabs" aria-label="Acesso à conta">
            <NavLink to="/login" state={{ from }}>
              Entrar na conta
            </NavLink>
            <NavLink to="/cadastro" state={{ from }}>
              Criar conta
            </NavLink>
          </nav>
          {registered && (
            <div className="mb-space-md">
              <Feedback kind="success" title="Solicitação de cadastro enviada">
                Se necessário, confirme seu e-mail antes de entrar com a senha cadastrada.
              </Feedback>
            </div>
          )}
          {mode === 'login' ? (
            <LoginForm key={`login-${location.key}`} initialEmail={initialEmail} />
          ) : (
            <RegisterForm
              onSuccess={(user) =>
                navigate('/login', {
                  replace: true,
                  state: { from, registered: true, email: user.email },
                })
              }
            />
          )}
        </div>
        <footer className="auth-footer">
          <p className="flex items-center justify-center gap-space-xs text-label uppercase">
            <Icon name="school" />
            Ambiente de demonstração
          </p>
          <p className="mt-space-sm">Projeto acadêmico · use apenas dados fictícios.</p>
        </footer>
      </div>
    </main>
  )
}
