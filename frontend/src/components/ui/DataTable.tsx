import type { ReactNode } from 'react'

export function DataTable({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="ui-table-scroll" role="region" aria-label={caption} tabIndex={0}>
      <table className="ui-table">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  )
}
