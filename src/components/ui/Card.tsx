import React from 'react'
import { cn } from '../../lib/utils'

interface CardProps { children: React.ReactNode; className?: string; onClick?: () => void }
export function Card({ children, className, onClick }: CardProps) {
  return (
    <div className={cn('card p-6', onClick && 'cursor-pointer hover:shadow-md transition-shadow', className)} onClick={onClick}>
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
