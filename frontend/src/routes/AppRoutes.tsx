import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ComponentsPreview } from '../pages/ComponentsPreview'
import { PlaceholderPage } from '../pages/PlaceholderPage'
import { AuthPage } from '../pages/AuthPage'
import { Feedback } from '../components/feedback/Feedback'
import { useAuth } from '../hooks/useAuth'
import { authReturnPath } from '../utils/authValidation'
import { navigation } from './navigation'
import { DashboardPage } from '../pages/DashboardPage'
import { TransactionsPage } from '../pages/TransactionsPage'
import { CategoriesPage } from '../pages/CategoriesPage'

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
        {navigation
          .filter((item) => item.path === '/relatorios')
          .map((item) => (
            <Route
              key={item.path}
              path={item.path}
              element={<PlaceholderPage title={item.label} description={item.description} />}
            />
          ))}
        <Route path="/componentes" element={<ComponentsPreview />} />
        <Route
          path="*"
          element={
            <PlaceholderPage
              title="Página não encontrada"
              description="O endereço solicitado não está disponível. Use o menu para continuar."
            />
          }
        />
      </Route>
    </Routes>
  )
}
