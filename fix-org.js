const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany();
  for (const org of orgs) {
    if (!org.activeModules || org.activeModules.length === 0) {
      await prisma.organization.update({
        where: { id: org.id },
        data: { activeModules: ["Lead", "Deal", "Account", "Task", "Products"] }
      });
      console.log(`Updated org ${org.id} with default activeModules`);
    } else {
      console.log(`Org ${org.id} already has activeModules:`, org.activeModules);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
