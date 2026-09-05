import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const fields = await prisma.field.findMany({
    where: { blueprint: { moduleType: 'Lead' } },
    select: { name: true, isSystemField: true, type: true }
  });
  console.log("Fields in DB:");
  console.table(fields);
}

main().finally(() => prisma.$disconnect());
