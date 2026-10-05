const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const prisma = require('../src/lib/prisma').default;

async function check() {
  const bps = await prisma.blueprint.findMany({
    where: { moduleType: 'Lead' },
    orderBy: { updatedAt: 'desc' },
    include: { fields: true, stages: true }
  });
  
  if (bps.length > 0) {
    for (const bp of bps) {
      console.log(`Blueprint ID: ${bp.id} | Org: ${bp.organizationId} | Fields: ${bp.fields.length} | Stages: ${bp.stages.length}`);
    }
  } else {
    console.log('No Lead blueprints found in the database at all.');
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
