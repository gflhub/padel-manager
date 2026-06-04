import { randomBytes } from 'crypto'

/**
 * Generate a test email address with random suffix to ensure uniqueness
 */
export function generateTestEmail(): string {
  const random = randomBytes(4).toString('hex')
  return `test-${random}@example.com`
}

/**
 * Generate a valid test password that meets all requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export function generateTestPassword(): string {
  return 'TestPassword123'
}

/**
 * Generate a mock user ID
 */
export function generateMockUserId(): string {
  return `user-${randomBytes(6).toString('hex')}`
}

/**
 * Generate a mock session ID
 */
export function generateMockSessionId(): string {
  return `session-${randomBytes(6).toString('hex')}`
}

/**
 * Create a mock user object for testing
 */
export function createMockUser(overrides?: Partial<any>) {
  return {
    id: generateMockUserId(),
    email: generateTestEmail(),
    passwordHash: '$2b$10$mock.hash',
    globalRole: 'CLIENT' as const,
    active: true,
    tokenVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

/**
 * Create a mock session object for testing
 */
export function createMockSession(overrides?: Partial<any>) {
  return {
    id: generateMockSessionId(),
    userId: generateMockUserId(),
    refreshTokenHash: randomBytes(32).toString('hex'),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    createdAt: new Date(),
    lastUsedAt: null,
    userAgent: null,
    ipAddress: null,
    ...overrides,
  }
}

/**
 * Create a mock JWT payload
 */
export function createMockJWTPayload(overrides?: Partial<any>) {
  return {
    sub: generateMockUserId(),
    sessionId: generateMockSessionId(),
    tokenVersion: 0,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900,
    ...overrides,
  }
}

/**
 * Simulate password hashing with bcrypt (mock-friendly)
 */
export async function mockBcryptHash(password: string): Promise<string> {
  return `$2b$10$mock.hash.of.${password}.${randomBytes(4).toString('hex')}`
}

/**
 * Sleep utility for async tests
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
