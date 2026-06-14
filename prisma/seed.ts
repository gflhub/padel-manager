import * as bcrypt from 'bcrypt'
import { PrismaClient } from '../lib/generated/prisma/client'

const prisma = new PrismaClient({} as any)

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.create({
    data: {
      email: 'admin@padelmanager.com',
      passwordHash,
      globalRole: 'ADMIN',
      profile: {
        create: { name: 'Admin Geral', email: 'admin@padelmanager.com' },
      },
    },
    include: { profile: true },
  })

  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@padelmanager.com',
      passwordHash,
      globalRole: 'STAFF',
      profile: {
        create: { name: 'Funcionário Staff', email: 'staff@padelmanager.com' },
      },
    },
    include: { profile: true },
  })

  const clientUser = await prisma.user.create({
    data: {
      email: 'cliente@padelmanager.com',
      passwordHash,
      globalRole: 'CLIENT',
      profile: {
        create: { name: 'Cliente Teste', email: 'cliente@padelmanager.com' },
      },
    },
    include: { profile: true },
  })

  const club = await prisma.club.create({
    data: {
      name: 'Arena Padel Clube',
      description: 'Clube de padel com quadras cobertas e descobertas',
    },
  })

  await prisma.clubStaff.create({
    data: {
      profileId: admin.profile!.id,
      clubId: club.id,
      role: 'OWNER',
      userId: admin.id,
    },
  })

  await prisma.clubStaff.create({
    data: {
      profileId: staffUser.profile!.id,
      clubId: club.id,
      role: 'STAFF',
      userId: staffUser.id,
    },
  })

  const courts = await Promise.all(
    [
      { name: 'Quadra 1', type: 'Coberta' },
      { name: 'Quadra 2', type: 'Descoberta' },
      { name: 'Quadra 3', type: 'Coberta' },
    ].map((court) =>
      prisma.court.create({
        data: { ...court, clubId: club.id },
      })
    )
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  await prisma.reservation.create({
    data: {
      courtId: courts[0].id,
      profileId: clientUser.profile!.id,
      userId: clientUser.id,
      date: today,
      startTime: '18:00',
      endTime: '19:00',
      status: 'CONFIRMED',
    },
  })

  const products = await Promise.all(
    [
      { name: 'Água Mineral', category: 'BEVERAGE', price: 5.0 },
      { name: 'Refrigerante', category: 'BEVERAGE', price: 7.5 },
      { name: 'Sanduíche Natural', category: 'FOOD', price: 18.0 },
      { name: 'Aluguel de Raquete', category: 'EQUIPMENT', price: 25.0 },
    ].map((product) =>
      prisma.product.create({
        data: { ...product, clubId: club.id } as any,
      })
    )
  )

  const comanda = await prisma.comanda.create({
    data: {
      clubId: club.id,
      number: 1,
      status: 'OPEN',
    },
  })

  await prisma.comandaItem.create({
    data: {
      comandaId: comanda.id,
      productId: products[0].id,
      quantity: 2,
      unitPrice: products[0].price,
      subtotal: products[0].price.mul(2),
    },
  })

  await prisma.tournament.create({
    data: {
      clubId: club.id,
      name: 'Torneio de Inverno',
      description: 'Torneio aberto para todos os níveis',
      startDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(today.getTime() + 32 * 24 * 60 * 60 * 1000),
      maxParticipants: 16,
      entryFee: 50.0,
      status: 'DRAFT',
      createdBy: admin.id,
    },
  })

  console.log('Seed concluído com sucesso.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
