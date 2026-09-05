import prisma from './src/lib/prisma.js';

async function main() {
  const leadStages = await prisma.stage.findMany({
    where: { blueprint: { moduleType: 'Lead' } },
    include: { blueprint: true }
  });
  console.log(leadStages.map(s => s.name));
}

main().finally(() => prisma.$disconnect());
