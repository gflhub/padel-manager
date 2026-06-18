import { NextRequest, NextResponse } from 'next/server'
import { ensureTestEnv } from '../_guard'
import { createCourt } from '@/app/actions/courts'

/**
 * Probe for privilege escalation (SEC-03): drives the real `createCourt`
 * Server Action, which requires club staff context. A client (no
 * ClubStaff row) is rejected by `requireClubContext` before anything is
 * created.
 */
export async function POST(request: NextRequest) {
  const guarded = ensureTestEnv()
  if (guarded) return guarded

  const body = await request.json()
  const formData = new FormData()
  formData.set('name', body.name ?? '')
  formData.set('court_type', body.court_type ?? 'padel')
  formData.set('price_per_slot', String(body.price_per_slot ?? 0))
  formData.set('duration_slot', String(body.duration_slot ?? 60))
  formData.set('active', String(body.active ?? true))

  const result = await createCourt(formData)

  if (result.error) {
    const status = /unauthorized|not authenticated/i.test(result.error)
      ? 401
      : /not a staff member/i.test(result.error)
        ? 403
        : 400
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json({ data: result.data })
}
