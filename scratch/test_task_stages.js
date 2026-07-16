const prisma = require('../src/lib/prisma.js').default || require('../src/lib/prisma.js');

async function main() {
  const taskBp = await prisma.blueprint.findFirst({
    where: { moduleType: 'Task' },
    include: { stages: true }
  });
  console.log("Task Blueprint:", JSON.stringify(taskBp, null, 2));

  // See if there's any recent errors in the app somehow? Not really possible.
}

main().catch(console.error).finally(() => prisma.$disconnect());
