import type { ReactNode } from 'react'

const paths = {
  edit: (
    <>
      <path d="m15 5 4 4M4 20l4-1L21 6l-4-4L4 15Z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 7V2l-3 3a8 8 0 1 0 3 10M20 7h-5" />
    </>
  ),
  clearFilter: (
    <>
      <path d="M3 3h18l-7 8v6l-4 4V11ZM3 3l18 18" />
    </>
  ),
  arrowDown: <path d="M12 3v18m-6-6 6 6 6-6" />,
  arrowUp: <path d="M12 21V3m-6 6 6-6 6 6" />,
  more: (
    <>
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  pie: (
    <>
      <path d="M12 3a9 9 0 1 0 9 9h-9Z" />
      <path d="M15 2v7h7a9 9 0 0 0-7-7Z" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-8 9 8v10h-6v-7H9v7H3Z" />
    </>
  ),
  shopping: (
    <>
      <path d="M2 3h3l3 12h11l3-9H6" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </>
  ),
  transport: (
    <>
      <rect x="5" y="3" width="14" height="16" rx="3" />
      <path d="M5 10h14M8 19v2M16 19v2M8 15h.01M16 15h.01" />
    </>
  ),
  health: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M9 5V3h6v2M12 10v6M9 13h6" />
    </>
  ),
  leisure: (
    <>
      <path d="M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3ZM12 6v16" />
    </>
  ),
  income: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 9v6M18 9v6" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="m3 3 18 18M10.5 5.1 12 5c6 0 10 7 10 7a21 21 0 0 1-3 3.6M6.2 6.2A24 24 0 0 0 2 12s4 7 10 7a12 12 0 0 0 5.5-1.5" />
      <path d="M10 10a3 3 0 0 0 4 4" />
    </>
  ),
  arrowRight: <path d="M4 12h16m-6-6 6 6-6 6" />,
  school: (
    <>
      <path d="m2 9 10-5 10 5-10 5ZM6 11v6l6 3 6-3v-6M22 9v7" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  transactions: (
    <>
      <path d="M6 3h13v18l-3-2-3 2-3-2-3 2-3-2V6" />
      <path d="M9 7h7M9 11h7M9 15h4" />
    </>
  ),
  categories: (
    <>
      <path d="m12 3 4 7H8Z" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <circle cx="17" cy="17.5" r="3.5" />
    </>
  ),
  reports: (
    <>
      <path d="M4 21V11h4v10M10 21V3h4v18M16 21v-7h4v7" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 6V4h14v4M3 8h18v13H3Z" />
      <path d="M21 12h-6v5h6" />
      <path d="M17 14.5h.01" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4M17 3v4M3 11h18" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2Z" />
    </>
  ),
  logout: (
    <>
      <path d="M10 3H4v18h6M10 12h11m-4-4 4 4-4 4" />
    </>
  ),
  plus: <path d="M12 4v16M4 12h16" />,
  check: <path d="m4 12 5 5L20 6" />,
  alert: (
    <>
      <path d="m12 3 10 18H2Z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7h.01" />
    </>
  ),
  search: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 6 6" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof paths

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  )
}
