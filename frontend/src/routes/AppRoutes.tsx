import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ComponentsPreview } from '../pages/ComponentsPreview'
import { PlaceholderPage } from '../pages/PlaceholderPage'
import type { UserProfile } from '../types/profile'
import { navigation } from './navigation'

export function AppRoutes({ user }: { user: UserProfile }) {
  return (
    <Routes>
      <Route element={<AppLayout user={user} />}>
        <Route index element={<Navigate to="/visao-geral" replace />} />
        {navigation.map((item) => (
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
