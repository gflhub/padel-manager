import { NextResponse } from 'next/server'

/**
 * All routes under app/api/e2e-only/* are test-only doors into Server Action
 * logic (login shortcuts, authorization probes). They must be unreachable
 * outside the E2E environment, so every handler calls this first and bails
 * with a 404 — indistinguishable from a route that doesn't exist.
 *
 * Gated on E2E_TEST_MODE rather than NODE_ENV: `next dev` hardcodes
 * `process.env.NODE_ENV = 'development'` regardless of what's passed in,
 * so NODE_ENV can never actually reach 'test' under the dev server these
 * routes run against.
 */
export function ensureTestEnv(): NextResponse | null {
  if (process.env.E2E_TEST_MODE !== '1') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return null
}
