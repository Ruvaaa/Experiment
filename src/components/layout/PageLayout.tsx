import React from 'react'

interface PageLayoutProps {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

export function PageLayout({ title, description, actions, children }: PageLayoutProps) {
  return (
    <div className="flex-1 min-w-0 flex flex-col">
      {(title || actions) && (
        <div className="flex items-start justify-between px-6 lg:px-8 pt-8 pb-6 bg-page">
          <div>
            {title && <h1 className="text-2xl font-semibold text-neutral-950">{title}</h1>}
            {description && <p className="text-sm text-neutral-500 mt-1">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-3 flex-shrink-0 ml-4">{actions}</div>}
        </div>
      )}
      <div className="flex-1 px-6 lg:px-8 pb-8">
        {children}
      </div>
    </div>
  )
}
