import React, { createContext, useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark'
export interface Theme { primaryColor: string; mode: ThemeMode }
export interface ThemeContextType {
  theme: Theme
  setThemeColor: (hex: string) => void
  setMode: (mode: ThemeMode) => void
  resetTheme: () => void
}

const STORAGE_KEY = 'experiment_theme'
const DEFAULT_PRIMARY = '#F5F5F5'

export const THEME_ACCENTS = {
  monochrome: '#F5F5F5', pink: '#C64A78', violet: '#8B5CF6', emerald: '#2F9E69', amber: '#D97706',
} as const

function readStoredTheme(): Theme {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<Theme>
    return {
      primaryColor: /^#[0-9A-F]{6}$/i.test(value.primaryColor || '') ? value.primaryColor! : DEFAULT_PRIMARY,
      mode: value.mode === 'light' ? 'light' : 'dark',
    }
  } catch { return { primaryColor: DEFAULT_PRIMARY, mode: 'dark' } }
}

function mix(hex: string, target: string, amount: number) {
  const a = hex.replace('#', '').match(/.{2}/g)?.map(value => parseInt(value, 16)) ?? [0, 0, 0]
  const b = target.replace('#', '').match(/.{2}/g)?.map(value => parseInt(value, 16)) ?? [255, 255, 255]
  const channel = (index: number) => Math.round(a[index] + (b[index] - a[index]) * amount).toString(16).padStart(2, '0')
  return `#${channel(0)}${channel(1)}${channel(2)}`
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme.mode
    root.style.colorScheme = theme.mode
    root.style.setProperty('--accent', theme.primaryColor)
    root.style.setProperty('--accent-hover', mix(theme.primaryColor, theme.mode === 'dark' ? '#FFFFFF' : '#000000', theme.mode === 'dark' ? 0.12 : 0.18))
    root.style.setProperty('--accent-foreground', theme.primaryColor === THEME_ACCENTS.monochrome ? '#0A0A0A' : '#FFFFFF')
    root.style.setProperty('--color-primary', theme.primaryColor)
    root.style.setProperty('--color-primary-hover', mix(theme.primaryColor, '#FFFFFF', 0.12))
    root.style.setProperty('--color-primary-light', mix(theme.primaryColor, '#FFFFFF', 0.88))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme))
  }, [theme])

  const resetTheme = () => setTheme({ primaryColor: DEFAULT_PRIMARY, mode: 'dark' })
  return <ThemeContext.Provider value={{ theme, setThemeColor: (hex) => /^#[0-9A-F]{6}$/i.test(hex) && setTheme(current => ({ ...current, primaryColor: hex.toUpperCase() })), setMode: (mode) => setTheme(current => ({ ...current, mode })), resetTheme }}>{children}</ThemeContext.Provider>
}
