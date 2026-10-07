import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const records = await prisma.customRecord.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  for (const r of records) {
    console.log('--- Record', r.id, '---');
    console.log('customData:', r.customData);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
