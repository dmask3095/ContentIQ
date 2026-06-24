import { PrismaClient } from '@prisma/client';

// ts-node-dev hot-reloads src/ on every save; without a cached singleton each
// reload would open a new Postgres connection pool and eventually exhaust
// the database's max connections.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
