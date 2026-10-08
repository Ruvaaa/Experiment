import React from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}
export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">{label}</label>}
      <input
        id={inputId}
        className={cn('w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-950 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink focus:border-transparent transition-colors', error && 'border-red-400 focus:ring-red-400', className)}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="text-xs text-neutral-400">{hint}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}
export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">{label}</label>}
      <textarea
        id={inputId}
        className={cn('w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white text-neutral-950 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-pink focus:border-transparent transition-colors resize-vertical', error && 'border-red-400', className)}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
