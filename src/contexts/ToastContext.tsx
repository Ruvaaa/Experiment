import React, { createContext, useContext } from 'react'
import type { Toast } from '../lib/hooks/useToast'
import { useToastState } from '../lib/hooks/useToast'

interface ToastContextValue {
  addToast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, addToast, removeToast } = useToastState()
  return (
    <ToastContext.Provider value={{addToast}}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
            t.type === 'success' ? 'bg-neutral-950' : t.type === 'error' ? 'bg-red-600' : 'bg-neutral-700'
          }`}>
            <span>{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="ml-2 opacity-70 hover:opacity-100" aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
