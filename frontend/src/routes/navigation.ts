import type { IconName } from '../components/ui/Icon'

export const navigation: { path: string; label: string; icon: IconName; description: string }[] = [
  {
    path: '/visao-geral',
    label: 'Visão Geral',
    icon: 'dashboard',
    description: 'Acompanhe suas receitas, despesas e saldo disponível.',
  },
  {
    path: '/transacoes',
    label: 'Transações',
    icon: 'transactions',
    description: 'Consulte e organize suas movimentações financeiras.',
  },
  {
    path: '/categorias',
    label: 'Categorias',
    icon: 'categories',
    description: 'Organize receitas e despesas em categorias próprias.',
  },
  {
    path: '/relatorios',
    label: 'Relatórios',
    icon: 'reports',
    description: 'Acompanhe a evolução financeira por período.',
  },
]
