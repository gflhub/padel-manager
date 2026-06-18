import type { APIRequestContext } from '@playwright/test'

/**
 * Thin client for /api/e2e-only/fixtures — read-only lookups into seeded
 * E2E data. Specs use this instead of querying Prisma directly: the
 * generated Prisma client is ESM-only and can't be imported into the
 * Playwright test runner's process, only into the Next.js server (which is
 * webpack-based and ESM-aware).
 */
async function getFixture<T>(request: APIRequestContext, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams(params).toString()
  const response = await request.get(`/api/e2e-only/fixtures?${query}`)
  if (!response.ok()) {
    throw new Error(`fixture lookup failed (${response.status()}): ${query}`)
  }
  const body = await response.json()
  return body.data as T
}

export function courtForClub(request: APIRequestContext, club: string) {
  return getFixture<{ id: string; pricePerSlot: number }>(request, { resource: 'court', club })
}

export function reservationForClub(request: APIRequestContext, club: string) {
  return getFixture<{ id: string; status: string; totalPrice: number }>(request, { resource: 'reservation', club })
}

export function reservationStatus(request: APIRequestContext, id: string) {
  return getFixture<{ status: string }>(request, { resource: 'reservation-status', id })
}

export function reservationsForSlot(request: APIRequestContext, courtId: string, date: string, startTime: string) {
  return getFixture<Array<{ id: string; status: string }>>(request, {
    resource: 'reservation-by-slot',
    courtId,
    date,
    startTime,
  })
}

export function comandaForClub(
  request: APIRequestContext,
  club: string,
  opts: { customerNameContains?: string; customerNameExcludes?: string } = {}
) {
  return getFixture<{ id: string; status: string; total: number; customerName: string | null }>(request, {
    resource: 'comanda',
    club,
    ...(opts.customerNameContains ? { customerNameContains: opts.customerNameContains } : {}),
    ...(opts.customerNameExcludes ? { customerNameExcludes: opts.customerNameExcludes } : {}),
  })
}

export function comandaStatus(request: APIRequestContext, id: string) {
  return getFixture<{ status: string }>(request, { resource: 'comanda-status', id })
}

export function paymentsForComanda(request: APIRequestContext, comandaId: string) {
  return getFixture<{ count: number; methods: string[]; amounts: number[] }>(request, {
    resource: 'payments',
    comandaId,
  })
}
