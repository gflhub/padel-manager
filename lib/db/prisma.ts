import { PrismaClient } from '../generated/prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const prismaClientSingleton = () => {
  // The `mariadb` npm driver only recognizes the literal `mariadb://` scheme,
  // even though it fully supports MySQL servers. DATABASE_URL stays `mysql://`
  // for the Prisma CLI/migration engine (which requires it for provider = "mysql");
  // rewrite the scheme here, just for this adapter's connection string parser.
  const connectionString = (process.env.DATABASE_URL ?? '').replace(/^mysql:\/\//, 'mariadb://')
  const adapter = new PrismaMariaDb(connectionString)
  return new PrismaClient({ adapter })
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  prismaClientSingleton()

if (process.env.NODE_ENV !== 'production')
  globalForPrisma.prisma = prisma
