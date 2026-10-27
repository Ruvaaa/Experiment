import React from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({ variant = 'primary', size = 'md', loading, className, disabled, children, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)] disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] active:brightness-90',
    secondary: 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--surface-elevated)]',
    ghost: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />}
      {children}
    </button>
  )
}
