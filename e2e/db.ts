import { execSync } from 'child_process'

/**
 * Resets DATABASE_URL to a clean schema (no data). Runs locally against
 * whatever database DATABASE_URL points to — don't point it at anything
 * you care about while running the E2E suite.
 */
export function resetDb(): void {
  execSync('npm run db:reset:e2e', { stdio: 'inherit' })
}

/**
 * Seeds DATABASE_URL with the deterministic two-clubs scenario.
 */
export function seed(): void {
  execSync('npm run db:seed:e2e', { stdio: 'inherit' })
}
