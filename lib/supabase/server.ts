/**
 * DEPRECATED: Supabase client is no longer used for authentication or data access.
 * The app has migrated to:
 * - Prisma for all data access
 * - JWT token auth for user sessions
 *
 * These functions are kept as stubs for backward compatibility during the transition period.
 * They should not be used in new code.
 */

export async function createClient() {
    throw new Error('Supabase client is no longer supported. Use Prisma for data access.')
}

export function createServiceClient() {
    throw new Error('Service role client is no longer supported. Use Prisma for data access.')
}
