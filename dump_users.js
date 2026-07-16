const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ include: { profile: true } });
  require('fs').writeFileSync('users_dump.json', JSON.stringify(users, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
