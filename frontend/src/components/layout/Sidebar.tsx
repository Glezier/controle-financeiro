import { Link, NavLink } from 'react-router-dom'
import { navigation } from '../../routes/navigation'
import type { UserProfile } from '../../types/profile'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Brand } from './Brand'

export function Sidebar({
  user,
  onNavigate,
  showBrand = true,
}: {
  user: UserProfile
  onNavigate?: () => void
  showBrand?: boolean
}) {
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
  return (
    <div className="app-sidebar-content">
      {showBrand && (
        <div className="app-sidebar-brand">
          <Brand />
        </div>
      )}
      <nav aria-label="Navegação principal" className="app-navigation">
        <p className="app-navigation-label">Navegação</p>
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) => `app-nav-link${isActive ? ' app-nav-link--active' : ''}`}
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="app-sidebar-footer">
        <div className="app-user">
          <span className="app-avatar" aria-hidden="true">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold" title={user.name}>
              {user.name}
            </p>
            <p className="truncate text-caption text-ink-secondary" title={user.email}>
              {user.email}
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          disabled
          className="w-full"
          aria-describedby={showBrand ? 'desktop-signout-note' : 'mobile-signout-note'}
        >
          <Icon name="logout" />
          Sair
        </Button>
        <p
          id={showBrand ? 'desktop-signout-note' : 'mobile-signout-note'}
          className="text-caption text-ink-secondary"
        >
          Sessão de demonstração. Autenticação em breve.
        </p>
        <Link to="/componentes" onClick={onNavigate} className="text-caption underline">
          Amostra de componentes
        </Link>
      </div>
    </div>
  )
}
