import { NextRequest, NextResponse } from 'next/server'
import { ensureTestEnv } from '../../_guard'
import { getReservations, updateReservationStatus } from '@/app/actions/reservations'

/**
 * Test-only probe driving the real Server Actions for cross-tenant read
 * (SEC-01) and unauthenticated access (SEC-05) checks: list reservations
 * scoped to the caller's own club (via requireClubContext) and look for the
 * requested id. A different club's reservation is invisible by construction.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guarded = ensureTestEnv()
  if (guarded) return guarded

  const { id } = await params
  const result = await getReservations()

  if (result.error) {
    const status = /unauthorized|not authenticated/i.test(result.error) ? 401 : 403
    return NextResponse.json({ error: result.error }, { status })
  }

  const reservation = result.data?.find((r) => r.id === id)
  if (!reservation) {
    return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
  }

  return NextResponse.json({ data: reservation })
}

/**
 * Probe for cross-tenant mutation (SEC-02): drives updateReservationStatus,
 * which is already club-scoped — a reservation belonging to another club
 * cannot be found, let alone mutated.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guarded = ensureTestEnv()
  if (guarded) return guarded

  const { id } = await params
  const { status } = await request.json()

  const result = await updateReservationStatus(id, status)

  if (result.error) {
    const httpStatus = /unauthorized|not authenticated/i.test(result.error)
      ? 401
      : /not found|não encontrada/i.test(result.error)
        ? 404
        : 403
    return NextResponse.json({ error: result.error }, { status: httpStatus })
  }

  return NextResponse.json({ error: null })
}
