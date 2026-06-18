import { NextRequest, NextResponse } from 'next/server'
import { ensureTestEnv } from '../_guard'
import { prisma } from '@/lib/db/prisma'

/**
 * Read-only lookups into seeded E2E fixture data (a club's court,
 * reservation, comanda, or the payments recorded for one). Specs use this
 * instead of importing the Prisma client directly into the Playwright
 * process — the generated client is ESM-only (`import.meta.url`), which
 * the Playwright test runner's CJS transform can't load. Running the same
 * query inside the Next.js server (webpack, ESM-aware) sidesteps that.
 */
export async function GET(request: NextRequest) {
  const guarded = ensureTestEnv()
  if (guarded) return guarded

  const { searchParams } = new URL(request.url)
  const resource = searchParams.get('resource')
  const club = searchParams.get('club')

  switch (resource) {
    case 'court': {
      const court = await prisma.court.findFirst({ where: { club: { name: club ?? undefined } } })
      if (!court) return NextResponse.json({ error: 'not found' }, { status: 404 })
      return NextResponse.json({ data: { id: court.id, pricePerSlot: Number(court.pricePerSlot) } })
    }
    case 'reservation': {
      // Scoped to today: the seed creates exactly one same-day reservation
      // per club, while every business-flow spec books future dates — this
      // is what keeps this lookup stable as other specs create/cancel
      // reservations concurrently in the same club.
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const reservation = await prisma.reservation.findFirst({
        where: {
          court: { club: { name: club ?? undefined } },
          date: { gte: today, lt: tomorrow },
        },
      })
      if (!reservation) return NextResponse.json({ error: 'not found' }, { status: 404 })
      return NextResponse.json({
        data: { id: reservation.id, status: reservation.status, totalPrice: Number(reservation.totalPrice) },
      })
    }
    case 'reservation-by-slot': {
      const courtId = searchParams.get('courtId')
      const date = searchParams.get('date')
      const startTime = searchParams.get('startTime')
      const reservations = await prisma.reservation.findMany({
        where: { courtId: courtId ?? undefined, date: date ? new Date(date) : undefined, startTime: startTime ?? undefined },
      })
      return NextResponse.json({ data: reservations.map((r) => ({ id: r.id, status: r.status })) })
    }
    case 'reservation-status': {
      const id = searchParams.get('id')
      const reservation = await prisma.reservation.findUnique({ where: { id: id ?? '' } })
      if (!reservation) return NextResponse.json({ error: 'not found' }, { status: 404 })
      return NextResponse.json({ data: { status: reservation.status } })
    }
    case 'comanda': {
      const customerNameContains = searchParams.get('customerNameContains')
      const customerNameExcludes = searchParams.get('customerNameExcludes')
      const comanda = await prisma.comanda.findFirst({
        where: {
          club: { name: club ?? undefined },
          ...(customerNameContains ? { customerName: { contains: customerNameContains } } : {}),
          ...(customerNameExcludes ? { NOT: { customerName: { contains: customerNameExcludes } } } : {}),
        },
      })
      if (!comanda) return NextResponse.json({ error: 'not found' }, { status: 404 })
      return NextResponse.json({
        data: { id: comanda.id, status: comanda.status, total: Number(comanda.total), customerName: comanda.customerName },
      })
    }
    case 'comanda-status': {
      const id = searchParams.get('id')
      const comanda = await prisma.comanda.findUnique({ where: { id: id ?? '' } })
      if (!comanda) return NextResponse.json({ error: 'not found' }, { status: 404 })
      return NextResponse.json({ data: { status: comanda.status } })
    }
    case 'payments': {
      const comandaId = searchParams.get('comandaId')
      const payments = await prisma.payment.findMany({ where: { comandaId: comandaId ?? undefined } })
      return NextResponse.json({
        data: { count: payments.length, methods: payments.map((p) => p.method), amounts: payments.map((p) => Number(p.amount)) },
      })
    }
    case 'court-by-name': {
      const name = searchParams.get('name')
      const court = await prisma.court.findFirst({ where: { name: name ?? undefined } })
      return NextResponse.json({ data: court ? { id: court.id } : null })
    }
    default:
      return NextResponse.json({ error: 'unknown resource' }, { status: 400 })
  }
}
