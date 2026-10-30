import type { ReactNode } from 'react'
import { Icon } from '../ui/Icon'

export function Feedback({
  kind = 'info',
  title,
  children,
  action,
}: {
  kind?: 'info' | 'success' | 'error' | 'empty' | 'loading'
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div
      className={`ui-feedback ui-feedback--${kind}`}
      role={
        kind === 'error' ? 'alert' : kind === 'loading' || kind === 'success' ? 'status' : undefined
      }
      aria-busy={kind === 'loading' || undefined}
    >
      {kind === 'loading' ? (
        <span className="ui-spinner" aria-hidden="true" />
      ) : (
        <Icon
          name={
            kind === 'error'
              ? 'alert'
              : kind === 'success'
                ? 'check'
                : kind === 'empty'
                  ? 'search'
                  : 'info'
          }
        />
      )}
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-space-xs text-body">{children}</div>}
        {action && <div className="mt-space-md">{action}</div>}
      </div>
    </div>
  )
}
