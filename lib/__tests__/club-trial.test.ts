import { describe, it, expect } from 'vitest'
import { getClubTrialStatus } from '../club-trial'

const DAY_MS = 24 * 60 * 60 * 1000

describe('getClubTrialStatus', () => {
  it('returns none when trialEndsAt is null', () => {
    expect(getClubTrialStatus({ trialEndsAt: null })).toEqual({ status: 'none', daysRemaining: null })
  })

  it('returns active when more than 5 days remain', () => {
    const trialEndsAt = new Date(Date.now() + 10 * DAY_MS)
    const result = getClubTrialStatus({ trialEndsAt })
    expect(result.status).toBe('active')
    expect(result.daysRemaining).toBe(10)
  })

  it('returns warning at exactly 5 days remaining', () => {
    const trialEndsAt = new Date(Date.now() + 5 * DAY_MS)
    const result = getClubTrialStatus({ trialEndsAt })
    expect(result.status).toBe('warning')
    expect(result.daysRemaining).toBe(5)
  })

  it('returns warning when less than 5 days remain', () => {
    const trialEndsAt = new Date(Date.now() + 1 * DAY_MS)
    const result = getClubTrialStatus({ trialEndsAt })
    expect(result.status).toBe('warning')
    expect(result.daysRemaining).toBe(1)
  })

  it('returns expired at exactly 0 (trialEndsAt in the past)', () => {
    const trialEndsAt = new Date(Date.now() - 1)
    const result = getClubTrialStatus({ trialEndsAt })
    expect(result.status).toBe('expired')
    expect(result.daysRemaining).toBe(0)
  })

  it('returns expired when trial ended in the past', () => {
    const trialEndsAt = new Date(Date.now() - 10 * DAY_MS)
    const result = getClubTrialStatus({ trialEndsAt })
    expect(result.status).toBe('expired')
    expect(result.daysRemaining).toBe(0)
  })
})
