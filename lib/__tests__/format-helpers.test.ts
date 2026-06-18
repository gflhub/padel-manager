import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  getInitials, 
  formatHumanDateTime, 
  formatElapsedTime, 
  getAvatarColors, 
  formatMemberSince 
} from '../format-helpers'

describe('format-helpers', () => {
  describe('getInitials', () => {
    it('returns ? for null or empty input', () => {
      expect(getInitials(null)).toBe('?')
      expect(getInitials(undefined)).toBe('?')
      expect(getInitials('')).toBe('?')
    })

    it('returns first two letters for single name', () => {
      expect(getInitials('Padel')).toBe('PA')
      expect(getInitials('a')).toBe('A')
    })

    it('returns first and last initials for multiple names', () => {
      expect(getInitials('Gabriel Ferreira Lima')).toBe('GL')
      expect(getInitials('John Doe')).toBe('JD')
    })

    it('handles extra spaces', () => {
      expect(getInitials('  First   Last  ')).toBe('FL')
    })
  })

  describe('formatHumanDateTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      // Fix date to a known Thursday: 2026-06-18 12:00
      vi.setSystemTime(new Date(2026, 5, 18, 12, 0, 0))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns "Hoje" for current date', () => {
      const today = new Date(2026, 5, 18, 15, 0)
      expect(formatHumanDateTime(today)).toBe('Hoje')
      expect(formatHumanDateTime(today, '15:00')).toBe('Hoje, 15:00')
    })

    it('returns "Ontem" for yesterday', () => {
      const yesterday = new Date(2026, 5, 17, 10, 0)
      expect(formatHumanDateTime(yesterday)).toBe('Ontem')
      expect(formatHumanDateTime(yesterday, '10:00')).toBe('Ontem, 10:00')
    })

    it('returns dd/mm for older dates', () => {
      const older = new Date(2026, 5, 10)
      expect(formatHumanDateTime(older)).toBe('10/06')
      expect(formatHumanDateTime(older, '14:00')).toBe('10/06, 14:00')
    })
  })

  describe('formatElapsedTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 5, 18, 12, 0, 0))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns minutes only if less than 1 hour', () => {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000)
      expect(formatElapsedTime(thirtyMinsAgo)).toBe('há 30m')
    })
    
    it('returns correct minutes', () => {
      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000)
      expect(formatElapsedTime(tenMinsAgo)).toBe('há 10m')
    })

    it('returns hours and minutes if 1 hour or more', () => {
      const eightyMinsAgo = new Date(Date.now() - 80 * 60 * 1000)
      expect(formatElapsedTime(eightyMinsAgo)).toBe('há 1h 20m')
    })

    it('returns 0m for future dates (clamped to 0)', () => {
      const future = new Date(Date.now() + 10 * 60 * 1000)
      expect(formatElapsedTime(future)).toBe('há 0m')
    })
  })

  describe('getAvatarColors', () => {
    it('returns a valid color pair for any string', () => {
      const result = getAvatarColors('Test Name')
      expect(result).toHaveProperty('bg')
      expect(result).toHaveProperty('text')
      expect(result.bg).toMatch(/^bg-/)
    })

    it('is deterministic', () => {
      const res1 = getAvatarColors('Same Name')
      const res2 = getAvatarColors('Same Name')
      expect(res1).toEqual(res2)
    })
  })

  describe('formatMemberSince', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 5, 18)) // June 2026
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns "este mês" for current month', () => {
      const date = new Date(2026, 5, 1)
      expect(formatMemberSince(date)).toBe('jun 2026 · este mês')
    })

    it('returns "há 1 mês" correctly', () => {
      const date = new Date(2026, 4, 15)
      expect(formatMemberSince(date)).toBe('mai 2026 · há 1 mês')
    })

    it('returns "há N meses" correctly', () => {
      const date = new Date(2026, 2, 10)
      expect(formatMemberSince(date)).toBe('mar 2026 · há 3 meses')
    })

    it('handles year change', () => {
      const date = new Date(2025, 11, 1) // Dec 2025
      expect(formatMemberSince(date)).toBe('dez 2025 · há 6 meses')
    })
  })
})
