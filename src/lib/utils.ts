import { format, formatDistanceToNow, isThisWeek } from 'date-fns'

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: string): string {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatRelative(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function isThisWeekDate(date: string): boolean {
  return isThisWeek(new Date(date))
}

export function formatAccuracy(value: number | null): string {
  if (value === null) return '—'
  return `${(value * 100).toFixed(2)}%`
}

export function formatMetric(value: number | null, decimals = 4): string {
  if (value === null) return '—'
  return value.toFixed(decimals)
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function getBestRun(runs: Array<{ accuracy: number | null }>): number | null {
  const accuracies = runs.map(r => r.accuracy).filter((a): a is number => a !== null)
  if (accuracies.length === 0) return null
  return Math.max(...accuracies)
}

export function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export const MILESTONE_LABELS: Record<string, string> = {
  first_experiment: 'First Experiment',
  ten_experiments: '10 Experiments',
  fifty_experiments: '50 Experiments',
  first_run: 'First Run',
  perfect_score: 'Perfect Score',
  five_models: '5 Models',
}
