import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import type { UserProfile } from '../../types/profile'
import { Modal } from '../ui/Modal'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppLayout({ user }: { user: UserProfile }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)

  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname
      const frame = requestAnimationFrame(() => {
        mainRef.current?.focus()
        window.scrollTo(0, 0)
      })
      return () => cancelAnimationFrame(frame)
    }
  }, [pathname])

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 64rem)')
    const closeDrawer = () => {
      if (desktop.matches) setMenuOpen(false)
    }
    desktop.addEventListener('change', closeDrawer)
    return () => desktop.removeEventListener('change', closeDrawer)
  }, [])

  return (
    <div className="app-shell">
      <a className="app-skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      <aside className="app-sidebar" aria-label="Menu lateral">
        <Sidebar user={user} />
      </aside>
      <div className="app-workspace">
        <Header
          menuOpen={menuOpen}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenProfile={() => setProfileOpen(true)}
        />
        <main id="main-content" ref={mainRef} tabIndex={-1} className="app-main">
          <Outlet />
        </main>
      </div>
      <Modal
        id="mobile-navigation"
        title="Navegação"
        variant="drawer"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      >
        <Sidebar user={user} showBrand={false} onNavigate={() => setMenuOpen(false)} />
      </Modal>
      <Modal
        title="Perfil de demonstração"
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      >
        <dl className="space-y-space-md">
          <div>
            <dt className="text-caption text-ink-secondary">Nome</dt>
            <dd className="break-words font-semibold">{user.name}</dd>
          </div>
          <div>
            <dt className="text-caption text-ink-secondary">E-mail</dt>
            <dd className="break-all">{user.email}</dd>
          </div>
        </dl>
        <p className="mt-space-lg text-caption text-ink-secondary">
          Dados ilustrativos. Nenhuma autenticação real está ativa.
        </p>
      </Modal>
    </div>
  )
}
