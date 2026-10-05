const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://mooncliq:mooncliq1122@mooncliq-crm.c1u0wmsm29gl.ap-south-1.rds.amazonaws.com:5432/postgres'
});
async function main() {
  const msgs = await prisma.chatMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('LATEST MESSAGES:', JSON.stringify(msgs, null, 2));
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
