import { cn } from '../../lib/utils'
interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string }
export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return <div className={cn('border-2 border-neutral-200 border-t-pink rounded-full animate-spin', sizes[size], className)} aria-label="Loading" role="status" />
}

export function PageSpinner() {
  return <div className="flex items-center justify-center min-h-64"><Spinner size="lg" /></div>
}
