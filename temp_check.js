const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stages = await prisma.stage.findMany({ where: { blueprint: { moduleType: 'Lead' } } });
  console.log('--- STAGES ---');
  console.log(stages.map(s => s.name));

  const blueprint = await prisma.blueprint.findFirst({ where: { moduleType: 'Lead' } });
  if (blueprint) {
    console.log('--- BLUEPRINT FIELDS ---');
    console.log(blueprint.fields.map(f => f.name));
  } else {
    console.log('No Lead blueprint found');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
