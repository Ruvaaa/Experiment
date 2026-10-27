import React from 'react'
import { useLocation } from 'react-router-dom'

interface PageLayoutProps {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

export function PageLayout({ title, description, actions, children }: PageLayoutProps) {
  const location = useLocation()
  const [entered, setEntered] = React.useState(false)
  const sectionLabels: Record<string, string> = {
    '/dashboard': 'Overview', '/experiments': 'Experiments', '/compare': 'Workspace', '/analytics': 'Workspace',
    '/datasets': 'Library', '/models': 'Library', '/notes': 'Knowledge', '/settings': 'Account',
  }
  const section = Object.entries(sectionLabels).find(([path]) => location.pathname === path || location.pathname.startsWith(`${path}/`))?.[1] ?? 'Workspace'

  React.useEffect(() => {
    setEntered(false)
    const frame = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(frame)
  }, [location.pathname])

  return (
    <div className="app-page flex-1 min-w-0 flex flex-col">
      {(title || actions) && (
        <div className={`app-page-header relative z-20 flex items-start justify-between px-4 sm:px-6 lg:px-8 pt-6 pb-5 ${entered ? 'is-entered' : ''}`}>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">{section} / {title || 'Detail'}</p>
            {title && <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">{title}</h1>}
            {description && <p className="text-sm text-neutral-500 mt-1">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-3 flex-shrink-0 ml-4">{actions}</div>}
        </div>
      )}
      <div className={`app-page-content mx-auto w-full max-w-[1600px] flex-1 px-4 sm:px-6 lg:px-8 pb-8 pt-6 ${entered ? 'is-entered' : ''}`}>
        {children}
      </div>
    </div>
  )
}
