import { NextRequest, NextResponse } from 'next/server'
import { ensureTestEnv } from '../../../_guard'
import { closeComanda } from '@/app/actions/comandas'

/**
 * Probe for IDOR on comanda close (SEC-04): drives the real `closeComanda`
 * Server Action, which is club-scoped — a comanda from another club is
 * reported as not found rather than closed.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guarded = ensureTestEnv()
  if (guarded) return guarded

  const { id } = await params
  const { paymentMethod } = await request.json()

  const result = await closeComanda(id, paymentMethod)

  if (result.error) {
    const status = /unauthorized|not authenticated/i.test(result.error)
      ? 401
      : /not found|não encontrada/i.test(result.error)
        ? 404
        : 403
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json({ error: null })
}
