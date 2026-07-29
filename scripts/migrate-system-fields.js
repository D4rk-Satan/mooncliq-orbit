require('dotenv').config();
require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_MODULE_FIELDS = {
  Lead: [
    { name: 'firstName', label: 'First Name', type: 'text', isRequired: true, orderIndex: 0, isSystemField: true },
    { name: 'lastName', label: 'Last Name', type: 'text', isRequired: true, orderIndex: 1, isSystemField: true },
    { name: 'email', label: 'Email', type: 'text', isRequired: false, orderIndex: 2, isSystemField: true },
    { name: 'phone', label: 'Phone', type: 'text', isRequired: false, orderIndex: 3, isSystemField: true },
    { name: 'owner', label: 'Owner', type: 'text', isRequired: false, orderIndex: 4, isSystemField: true }
  ],
  Deal: [
    { name: 'firstName', label: 'First Name', type: 'text', isRequired: true, orderIndex: 0, isSystemField: true },
    { name: 'lastName', label: 'Last Name', type: 'text', isRequired: true, orderIndex: 1, isSystemField: true },
    { name: 'email', label: 'Email', type: 'text', isRequired: false, orderIndex: 2, isSystemField: true },
    { name: 'phone', label: 'Phone', type: 'text', isRequired: false, orderIndex: 3, isSystemField: true },
    { name: 'amount', label: 'Amount', type: 'number', isRequired: false, orderIndex: 4, isSystemField: true }
  ],
  Account: [
    { name: 'companyName', label: 'Company Name', type: 'text', isRequired: true, orderIndex: 0, isSystemField: true },
    { name: 'email', label: 'Email', type: 'text', isRequired: false, orderIndex: 1, isSystemField: true },
    { name: 'gstNo', label: 'GST No', type: 'text', isRequired: false, orderIndex: 2, isSystemField: true },
    { name: 'website', label: 'Website', type: 'text', isRequired: false, orderIndex: 3, isSystemField: true },
    { name: 'address', label: 'Address', type: 'textarea', isRequired: false, orderIndex: 4, isSystemField: true },
    { name: 'contactPerson', label: 'Contact Person', type: 'text', isRequired: false, orderIndex: 5, isSystemField: true }
  ],
  Product: [
    { name: 'name', label: 'Product Name', type: 'text', isRequired: true, orderIndex: 0, isSystemField: true },
    { name: 'sku', label: 'SKU', type: 'text', isRequired: true, orderIndex: 1, isSystemField: true }
  ],
  Task: [
    { name: 'taskName', label: 'Task Name', type: 'text', isRequired: true, orderIndex: 0, isSystemField: true },
    { name: 'startDateTime', label: 'Start Date & Time', type: 'date', isRequired: false, orderIndex: 1, isSystemField: true },
    { name: 'dueDateTime', label: 'Due Date & Time', type: 'date', isRequired: false, orderIndex: 2, isSystemField: true },
    { name: 'endDateTime', label: 'End Date & Time', type: 'date', isRequired: false, orderIndex: 3, isSystemField: true },
    { name: 'repeat', label: 'Repeat', type: 'text', isRequired: false, orderIndex: 4, isSystemField: true },
    { name: 'alert', label: 'Alert', type: 'text', isRequired: false, orderIndex: 5, isSystemField: true },
    { name: 'notes', label: 'Notes', type: 'textarea', isRequired: false, orderIndex: 6, isSystemField: true }
  ]
};

async function main() {
  console.log('Starting migration to inject system fields...');
  console.log('Using DB URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) + '...' : 'Not found');

  const blueprints = await prisma.blueprint.findMany();
  let createdCount = 0;

  for (const bp of blueprints) {
    const fieldsToCreate = DEFAULT_MODULE_FIELDS[bp.moduleType] || [];
    
    for (const f of fieldsToCreate) {
      const existing = await prisma.field.findFirst({
        where: { blueprintId: bp.id, name: f.name }
      });

      if (!existing) {
        await prisma.field.create({
          data: {
            ...f,
            blueprintId: bp.id,
            sectionName: 'General Information',
            sectionOrder: 0
          }
        });
        createdCount++;
        console.log(`Created system field: ${f.name} for blueprint: ${bp.moduleType}`);
      }
    }
  }

  console.log(`Migration completed successfully! Created ${createdCount} system fields.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
