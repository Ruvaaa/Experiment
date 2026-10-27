// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { clearAuthDestination, isSafeAppDestination, saveAuthDestination, takeAuthDestination } from '../authRedirect'

describe('OAuth auth destinations', () => {
  beforeEach(() => clearAuthDestination())

  it('defaults to the dashboard when there is no saved destination', () => {
    expect(takeAuthDestination()).toBe('/dashboard')
  })

  it('restores a protected route requested before OAuth', () => {
    saveAuthDestination('/experiments/abc123')
    expect(takeAuthDestination()).toBe('/experiments/abc123')
    expect(takeAuthDestination()).toBe('/dashboard')
  })

  it('rejects external and protocol-relative destinations', () => {
    expect(isSafeAppDestination('https://example.com')).toBe(false)
    expect(isSafeAppDestination('//example.com')).toBe(false)
    expect(isSafeAppDestination('/analytics')).toBe(true)
  })
})
