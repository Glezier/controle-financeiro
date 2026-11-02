import { Icon } from '../ui/Icon'

export function Brand() {
  return (
    <div className="app-brand">
      <span className="app-brand-mark">
        <Icon name="wallet" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold leading-tight">Controle Financeiro</p>
        <span className="app-brand-tag">MVP Acadêmico</span>
      </div>
    </div>
  )
}
