import { notFound } from 'next/navigation'

/**
 * Test-only page that always throws, used by UI-09 to verify the
 * app/error.tsx boundary shows a recoverable fallback instead of a blank
 * page or an unhandled crash. Unreachable outside the E2E environment.
 */
export default function E2eErrorProbePage(): never {
    if (process.env.E2E_TEST_MODE !== '1') {
        notFound()
    }
    throw new Error('e2e-error-probe: intentional failure for UI-09')
}
