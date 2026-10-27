import { describe, expect, it } from 'vitest'
import { normalizeAccuracy } from '../utils'

describe('normalizeAccuracy', () => {
  it('preserves fraction metrics', () => {
    expect(normalizeAccuracy('0.95')).toBe(0.95)
    expect(normalizeAccuracy(0)).toBe(0)
  })

  it('converts percentage metrics to fractions', () => {
    expect(normalizeAccuracy('95')).toBe(0.95)
    expect(normalizeAccuracy(100)).toBe(1)
  })

  it('distinguishes missing and invalid values', () => {
    expect(normalizeAccuracy('')).toBeNull()
    expect(normalizeAccuracy('-1')).toBeNull()
    expect(normalizeAccuracy('101')).toBeNull()
    expect(normalizeAccuracy('NaN')).toBeNull()
  })
})
