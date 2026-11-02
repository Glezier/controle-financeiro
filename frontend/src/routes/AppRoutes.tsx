import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ComponentsPreview } from '../pages/ComponentsPreview'
import { NotFoundPage } from '../pages/NotFoundPage'
import { AuthPage } from '../pages/AuthPage'
import { Feedback } from '../components/feedback/Feedback'
import { useAuth } from '../hooks/useAuth'
import { authReturnPath } from '../utils/authValidation'
import { DashboardPage } from '../pages/DashboardPage'
import { TransactionsPage } from '../pages/TransactionsPage'
import { CategoriesPage } from '../pages/CategoriesPage'
import { ReportsPage } from '../pages/ReportsPage'

export function AppRoutes() {
  const { state } = useAuth()
  const location = useLocation()
  if (state.status === 'loading')
    return (
      <main className="auth-loading">
        <Feedback kind="loading" title="Preparando demonstração">
          Aguarde um instante.
        </Feedback>
      </main>
    )
  const returnTo = authReturnPath(location.state?.from)
  return (
    <Routes>
      <Route
        path="/login"
        element={
          state.status === 'authenticated' ? (
            <Navigate to={returnTo} replace />
          ) : (
            <AuthPage mode="login" />
          )
        }
      />
      <Route
        path="/cadastro"
        element={
          state.status === 'authenticated' ? (
            <Navigate to={returnTo} replace />
          ) : (
            <AuthPage mode="register" />
          )
        }
      />
      <Route
        element={
          state.status === 'authenticated' ? (
            <AppLayout user={state.user} />
          ) : (
            <Navigate
              to="/login"
              state={{ from: authReturnPath(location.pathname + location.search) }}
              replace
            />
          )
        }
      >
        <Route index element={<Navigate to="/visao-geral" replace />} />
        <Route path="/visao-geral" element={<DashboardPage />} />
        <Route path="/transacoes" element={<TransactionsPage />} />
        <Route path="/categorias" element={<CategoriesPage />} />
        <Route path="/relatorios" element={<ReportsPage />} />
        <Route path="/componentes" element={<ComponentsPreview />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
