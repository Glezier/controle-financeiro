import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes/AppRoutes'

// Layout fixture only. Session and profile retrieval will be isolated in services
// when the authentication stage begins; no credentials or tokens are stored here.
const demonstrationUser = { name: 'Lucas Mendes', email: 'lucas.mendes@email.com' }

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes user={demonstrationUser} />
    </BrowserRouter>
  )
}
