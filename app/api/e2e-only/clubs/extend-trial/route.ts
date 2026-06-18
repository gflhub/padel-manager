import { NextRequest, NextResponse } from 'next/server'
import { ensureTestEnv } from '../../_guard'
import { prisma } from '@/lib/db/prisma'

/**
 * Test-only fixture mutation for TRI-03 (manual trial extension): there is
 * no platform UI for this yet, so the probe simulates the operator action
 * directly — extend a club's trialEndsAt N days into the future.
 */
export async function POST(request: NextRequest) {
  const guarded = ensureTestEnv()
  if (guarded) return guarded

  const { clubName, days } = await request.json()
  if (typeof clubName !== 'string' || typeof days !== 'number') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const club = await prisma.club.findFirst({ where: { name: clubName } })
  if (!club) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  await prisma.club.update({ where: { id: club.id }, data: { trialEndsAt } })

  return NextResponse.json({ error: null })
}
