import { useState, KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface TagInputProps { value: string[]; onChange: (tags: string[]) => void; placeholder?: string; className?: string }
export function TagInput({ value, onChange, placeholder = 'Add tag...', className }: TagInputProps) {
  const [input, setInput] = useState('')
  function addTag() {
    const t = input.trim().toLowerCase()
    if (t && !value.includes(t)) onChange([...value, t])
    setInput('')
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
    if (e.key === 'Backspace' && !input && value.length) onChange(value.slice(0, -1))
  }
  return (
    <div className={cn('flex flex-wrap gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 bg-white min-h-[42px] focus-within:ring-2 focus-within:ring-pink focus-within:border-transparent', className)}>
      {value.map(tag => (
        <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-pink-muted text-pink text-xs font-medium rounded-md">
          {tag}
          <button type="button" onClick={() => onChange(value.filter(t => t !== tag))} aria-label={`Remove ${tag}`}><X size={10} /></button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKey}
        onBlur={addTag}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[80px] text-sm outline-none bg-transparent text-neutral-950 placeholder-neutral-400"
      />
    </div>
  )
}
