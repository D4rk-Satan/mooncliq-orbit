const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const orgs = await prisma.organization.findMany({ select: { id: true, activeModules: true } });
  console.log(JSON.stringify(orgs, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
