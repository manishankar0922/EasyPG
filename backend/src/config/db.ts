import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Only log errors/warnings — query logging is a CPU and memory hog in production
    log: process.env.NODE_ENV === 'production'
      ? [
          { level: 'error', emit: 'stdout' },
          { level: 'warn', emit: 'stdout' }
        ]
      : [
          { level: 'warn', emit: 'stdout' },
          { level: 'error', emit: 'stdout' }
        ],
    errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'pretty',
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown — releases DB connections on process exit.
// Without this, Render accumulates zombie Postgres connections over time,
// causing "too many clients" errors after ~1hr of usage.
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
