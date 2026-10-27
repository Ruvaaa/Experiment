import React from 'react'
import { cn } from '../../lib/utils'

interface CardProps { children: React.ReactNode; className?: string; onClick?: () => void }
export function Card({ children, className, onClick }: CardProps) {
  return (
    <div className={cn('card border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--text-primary)] rounded-xl', onClick && 'cursor-pointer hover:border-[var(--accent)] transition-colors', className)} onClick={onClick}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex items-center justify-between mb-4', className)}>{children}</div>
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-sm font-semibold text-neutral-500 uppercase tracking-wide', className)}>{children}</h3>
}
