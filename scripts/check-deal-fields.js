import prisma from '../src/lib/prisma.js';

async function main() {
  const fields = await prisma.field.findMany({
    where: { blueprint: { moduleType: 'Deal' } }
  });
  console.log('Total Deal fields:', fields.length);
  const names = fields.map(f => f.name);
  console.log('Fields:', names);
}
main().finally(() => process.exit(0));
