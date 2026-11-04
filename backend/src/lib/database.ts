import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../generated/prisma/client.js';
import { databaseError } from './errors.js';

export interface UserDatabase {
  withUser<T>(userId: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
  ping(): Promise<void>;
  close(): Promise<void>;
}

export function createDatabase(connectionString: string, maxConnections = 5): UserDatabase {
  const adapter = new PrismaPg({ connectionString, max: maxConnections, connectionTimeoutMillis: 10000 });
  const client = new PrismaClient({ adapter });
  return {
    async withUser(userId, work) {
      try {
        return await client.$transaction(async (tx) => {
          await tx.$executeRaw`SET LOCAL ROLE authenticated`;
          await tx.$queryRaw`SELECT set_config('request.jwt.claim.sub', ${userId}, true),
            set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
          return work(tx);
        }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, maxWait: 10000, timeout: 15000 });
      } catch (error) {
        databaseError(error);
        throw error;
      }
    },
    async ping() { await client.$queryRaw`SELECT 1`; },
    async close() { await client.$disconnect(); },
  };
}
