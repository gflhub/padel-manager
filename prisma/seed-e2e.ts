/**
 * Deterministic "two-clubs" seed for the E2E suite.
 *
 * Builds Clube A (trial active) and Clube B (trial expired), each with
 * admin/staff/client users (password Test1234!), courts, a same-day
 * reservation, and monthly members. Runs against DATABASE_URL via
 * `npm run db:seed:e2e` — the E2E suite is meant to run locally, so this
 * wipes and reseeds whatever database DATABASE_URL points to.
 */
import 'dotenv/config'
import * as bcrypt from 'bcrypt'
import { prisma } from '../lib/db/prisma'
import {
  ClubStaffRole,
  CourtStatus,
  ReservationStatus,
  ProductCategory,
  SubscriptionStatus,
} from '../lib/generated/prisma/enums'
console.log(process.env.DATABASE_URL) // sanity check to avoid running against prod by accident

const PASSWORD = 'Test1234!'

function todayAt(hours: number, minutes = 0): Date {
  const d = new Date()
  d.setHours(hours, minutes, 0, 0)
  return d
}

function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

async function createUser(email: string, name: string) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10)
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      globalRole: 'CLIENT',
      profile: { create: { name, email } },
    },
    include: { profile: true },
  })
}

async function buildClub(opts: {
  suffix: 'a' | 'b'
  name: string
  courtCount: number
  reservationHour: number
  trialEndsInDays: number
  members: Array<{ status: SubscriptionStatus }>
}) {
  const { suffix, name, courtCount, reservationHour, trialEndsInDays, members } = opts

  const admin = await createUser(`admin.${suffix}@e2e.test`, `Admin ${name}`)
  const staff = await createUser(`staff.${suffix}@e2e.test`, `Staff ${name}`)
  const client = await createUser(`client.${suffix}@e2e.test`, `Cliente ${name}`)

  const club = await prisma.club.create({
    data: {
      name,
      description: `Seed E2E — ${name}`,
      trialStartedAt: daysFromNow(-30),
      trialEndsAt: daysFromNow(trialEndsInDays),
    },
  })

  await prisma.clubStaff.create({
    data: { profileId: admin.profile!.id, clubId: club.id, role: ClubStaffRole.OWNER, userId: admin.id },
  })
  await prisma.clubStaff.create({
    data: { profileId: staff.profile!.id, clubId: club.id, role: ClubStaffRole.STAFF, userId: staff.id },
  })

  const courts = await Promise.all(
    Array.from({ length: courtCount }, (_, i) =>
      prisma.court.create({
        data: {
          clubId: club.id,
          name: `Quadra ${i + 1}`,
          type: i % 2 === 0 ? 'Coberta' : 'Descoberta',
          pricePerSlot: 80,
          durationSlot: 60,
          status: CourtStatus.ACTIVE,
        },
      })
    )
  )

  await prisma.reservation.create({
    data: {
      courtId: courts[0].id,
      profileId: client.profile!.id,
      userId: client.id,
      date: todayAt(0),
      startTime: `${String(reservationHour).padStart(2, '0')}:00`,
      endTime: `${String(reservationHour + 1).padStart(2, '0')}:00`,
      pricePerHour: 80,
      totalPrice: 80,
      status: ReservationStatus.CONFIRMED,
    },
  })

  const product = await prisma.product.create({
    data: {
      clubId: club.id,
      name: 'Água Mineral',
      category: ProductCategory.bebidas,
      price: 5,
      stock: 50,
      available: true,
    },
  })

  // Three independent comandas so the SEC-04 (must stay OPEN), COM-02
  // (close via UI) and COM-04 (double-close via probe) specs never race
  // each other over the same row.
  const comandaNames = [`Cliente ${name}`, `Cliente ${name} (Fechamento)`, `Cliente ${name} (Fechamento Dupla)`]
  for (const [n, customerName] of comandaNames.entries()) {
    const comanda = await prisma.comanda.create({
      data: { clubId: club.id, number: n + 1, customerName, status: 'OPEN' },
    })
    await prisma.comandaItem.create({
      data: {
        comandaId: comanda.id,
        productId: product.id,
        quantity: 2,
        unitPrice: product.price,
        subtotal: product.price.mul(2),
      },
    })
    await prisma.comanda.update({ where: { id: comanda.id }, data: { total: product.price.mul(2) } })
  }

  for (const [i, member] of members.entries()) {
    await prisma.subscription.create({
      data: {
        userId: client.id,
        clubId: club.id,
        planName: member.status === SubscriptionStatus.OVERDUE ? 'Mensalista Atrasado E2E' : 'Mensalista Ativo E2E',
        price: 250,
        dueDay: 5,
        status: member.status,
        nextDueDate: member.status === SubscriptionStatus.OVERDUE ? daysFromNow(-5) : daysFromNow(10),
      },
    })
    void i
  }

  return { club, admin, staff, client, courts }
}

async function main() {
  const { club: clubA } = await buildClub({
    suffix: 'a',
    name: 'Clube A',
    courtCount: 3,
    reservationHour: 18,
    trialEndsInDays: 20, // trial active
    members: [{ status: SubscriptionStatus.ACTIVE }, { status: SubscriptionStatus.OVERDUE }],
  })

  await buildClub({
    suffix: 'b',
    name: 'Clube B',
    courtCount: 2,
    reservationHour: 19,
    trialEndsInDays: -5, // trial expired
    members: [{ status: SubscriptionStatus.ACTIVE }],
  })

  // Dedicated accounts for tests that mutate auth state (logout, tokenVersion
  // bump). Kept out of the `ROLES` list / global.setup storageState so they
  // never poison the shared per-role sessions other specs depend on. Two
  // separate accounts (not one reused) so the AUTH-02 and AUTH-08 tests,
  // which run in parallel, can't race each other's logout/tokenVersion bump.
  for (const email of ['session.a@e2e.test', 'session2.a@e2e.test']) {
    const sessionUser = await createUser(email, 'Sessão Teste')
    await prisma.clubStaff.create({
      data: { profileId: sessionUser.profile!.id, clubId: clubA.id, role: ClubStaffRole.STAFF, userId: sessionUser.id },
    })
  }

  console.log('[e2e] two-clubs seed concluído.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
