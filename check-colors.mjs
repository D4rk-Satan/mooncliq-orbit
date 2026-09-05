import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const leadStages = await prisma.stage.findMany({
    where: { blueprint: { moduleType: 'Lead' } }
  });
  console.log("Lead stages from DB:", leadStages.map(s => ({ name: s.name, color: s.color })));
}

main().finally(() => prisma.$disconnect());
