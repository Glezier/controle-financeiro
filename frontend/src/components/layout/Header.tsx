import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

export function Header({
  menuOpen,
  onOpenMenu,
  onOpenProfile,
}: {
  menuOpen: boolean
  onOpenMenu: () => void
  onOpenProfile: () => void
}) {
  const today = new Date()
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(today)
  return (
    <header className="app-header">
      <div className="flex min-w-0 items-center gap-space-sm">
        <Button
          variant="ghost"
          className="app-menu-toggle ui-icon-button"
          aria-label="Abrir menu de navegação"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={onOpenMenu}
        >
          <Icon name="menu" />
        </Button>
        <div className="app-header-date">
          <Icon name="calendar" />
          <span>
            Hoje:{' '}
            <time
              dateTime={`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`}
            >
              {formattedDate}
            </time>
          </span>
        </div>
        <span className="app-header-mobile-title font-semibold">Controle Financeiro</span>
      </div>
      <div className="flex items-center gap-space-sm">
        <span className="app-account-badge">
          <Badge tone="income">Conta de demonstração</Badge>
        </span>
        <Button
          className="ui-icon-button"
          aria-label="Ver perfil de demonstração"
          onClick={onOpenProfile}
        >
          <Icon name="user" />
        </Button>
      </div>
    </header>
  )
}
