import React from 'react'
import { cn } from '../../lib/utils'

interface BadgeProps { children: React.ReactNode; variant?: 'default' | 'pink' | 'green' | 'yellow' | 'red' | 'blue'; className?: string }
export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-neutral-100 text-neutral-600',
    pink: 'bg-pink-muted text-pink',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}
