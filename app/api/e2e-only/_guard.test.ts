import { describe, it, expect, afterEach, vi } from 'vitest'
import { ensureTestEnv } from './_guard'

describe('ensureTestEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 404 when E2E_TEST_MODE is not set', async () => {
    vi.stubEnv('E2E_TEST_MODE', '')
    const response = ensureTestEnv()
    expect(response?.status).toBe(404)

    vi.stubEnv('E2E_TEST_MODE', 'true')
    const wrongValueResponse = ensureTestEnv()
    expect(wrongValueResponse?.status).toBe(404)
  })

  it('allows the request through when E2E_TEST_MODE=1', () => {
    vi.stubEnv('E2E_TEST_MODE', '1')
    expect(ensureTestEnv()).toBeNull()
  })
})
