const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stages = await prisma.stage.findMany({
    include: {
      blueprint: true
    }
  });

  console.log("All Stages from DB:");
  stages.forEach(s => {
    console.log(`- ${s.name} (Module: ${s.blueprint?.moduleType})`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
