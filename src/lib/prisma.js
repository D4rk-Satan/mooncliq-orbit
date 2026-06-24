import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClientSingleton = () => {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

const prisma = prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  // Clear the old cache and set the new one
  globalThis.prismaGlobal = prisma;
}

export default prisma;
