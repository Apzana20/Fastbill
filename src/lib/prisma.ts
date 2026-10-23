import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// In production (packaged Electron), main.js sets DATABASE_URL to the userData path.
// In development, falls back to the local dev.db via .env or default.
const getDatabaseUrl = () => {
  return process.env.DATABASE_URL || 'file:./dev.db';
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
