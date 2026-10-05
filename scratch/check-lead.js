const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const bp = await prisma.blueprint.findFirst({
    where: { moduleType: 'Lead' },
    orderBy: { updatedAt: 'desc' },
    include: { fields: true }
  });
  if (bp) {
    console.log('Blueprint ID:', bp.id, 'Fields count:', bp.fields.length);
  } else {
    console.log('No Lead blueprint found');
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
