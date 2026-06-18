import { NextRequest, NextResponse } from 'next/server'
import { ensureTestEnv } from '../_guard'
import { createReservation, cancelOwnReservation } from '@/app/actions/reservations'

/**
 * Probe driving the real `createReservation` Server Action for the
 * reservation business-flow specs (RES-01 valid booking + price, RES-02
 * conflict, SEC-08 past-date rejection) — the same overlap/pricing logic
 * the client booking UI calls, without scripting its multi-step form.
 */
export async function POST(request: NextRequest) {
  const guarded = ensureTestEnv()
  if (guarded) return guarded

  const body = await request.json()
  const formData = new FormData()
  formData.set('court_id', body.court_id ?? '')
  formData.set('date', body.date ?? '')
  formData.set('start_time', body.start_time ?? '')
  formData.set('duration', String(body.duration ?? 60))
  formData.set('players', JSON.stringify(body.players ?? []))

  const result = await createReservation(formData)

  if (result.error) {
    const status = /unauthorized|not authenticated/i.test(result.error) ? 401 : 400
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json({ data: result.data })
}

/**
 * Probe for RES-03 (cancellation frees the slot): drives the real
 * `cancelOwnReservation` Server Action.
 */
export async function DELETE(request: NextRequest) {
  const guarded = ensureTestEnv()
  if (guarded) return guarded

  const { id } = await request.json()
  const result = await cancelOwnReservation(id)

  if (result.error) {
    const status = /unauthorized|not authenticated/i.test(result.error) ? 401 : 400
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json({ error: null })
}
