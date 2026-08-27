const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const blueprints = await prisma.blueprint.findMany({ where: { moduleType: 'Deal' } });
  for (const bp of blueprints) {
    const fields = await prisma.field.findMany({ where: { blueprintId: bp.id } });
    console.log(`Blueprint ${bp.id} has ${fields.length} fields.`);
    
    // check for duplicates by name
    const counts = {};
    for (const f of fields) {
      counts[f.name] = (counts[f.name] || 0) + 1;
    }
    const dups = Object.entries(counts).filter(([name, c]) => c > 1);
    if (dups.length > 0) {
      console.log('Duplicates:', dups);
      // delete duplicates
      for (const [name] of dups) {
        const dupFields = fields.filter(f => f.name === name);
        // keep one
        for (let i = 1; i < dupFields.length; i++) {
          await prisma.field.delete({ where: { id: dupFields[i].id } });
          console.log(`Deleted duplicate field ${name}`);
        }
      }
    } else {
      console.log('No duplicates.');
    }
  }
}
check().finally(() => process.exit(0));
