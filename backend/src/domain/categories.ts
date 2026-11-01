export const CATEGORY_ICONS = [
  'category', 'restaurant', 'home', 'directions_bus', 'medical_services',
  'sports_esports', 'account_balance_wallet', 'work', 'school', 'shopping_cart', 'payments',
] as const;

const labels: Record<(typeof CATEGORY_ICONS)[number], string> = {
  category: 'Geral', restaurant: 'Alimentação', home: 'Moradia', directions_bus: 'Transporte',
  medical_services: 'Saúde', sports_esports: 'Lazer', account_balance_wallet: 'Salário e renda',
  work: 'Trabalho', school: 'Educação', shopping_cart: 'Compras', payments: 'Pagamentos',
};

export const CATEGORY_ICON_OPTIONS = CATEGORY_ICONS.map((id) => ({ id, label: labels[id] }));
