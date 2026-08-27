require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { getDefaultBlueprintData } = require('../src/utils/blueprintDefaults');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
async function main() {
  console.log('Starting Deal fields update...');
  const dealDefaults = getDefaultBlueprintData('Deal');
  const defaultFields = dealDefaults.fields.create;

  const organizations = await prisma.organization.findMany();
  for (const org of organizations) {
    console.log(`Processing org: ${org.id}`);
    let blueprint = await prisma.blueprint.findFirst({
      where: { organizationId: org.id, moduleType: 'Deal' }
    });
    if (!blueprint) continue;

    const deleted = await prisma.field.deleteMany({
      where: { blueprintId: blueprint.id }
    });
    console.log(`Deleted ${deleted.count} old fields.`);

    const fieldsData = defaultFields.map(f => {
        let mappings = undefined;
        if (f.mappings) mappings = JSON.stringify(f.mappings);
        return {
            name: f.name,
            label: f.label,
            type: f.type,
            options: f.options || [],
            isRequired: f.isRequired || false,
            isSystemField: f.isSystemField || false,
            isHidden: f.isHidden || false,
          sectionName: f.sectionName || 'General',
          orderIndex: f.orderIndex || 0,
          blueprintId: blueprint.id,
          targetModule: f.targetModule,
          mappings: mappings
        };
    });

    const created = await prisma.field.createMany({ data: fieldsData });
    console.log(`Created ${created.count} new fields for org ${org.id}.`);
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
