import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Mooncliq Orbit',
    },
  });
  console.log('Created Organization:', org.id);

  // 2. Create Lead Blueprint
  const blueprint = await prisma.blueprint.create({
    data: {
      organizationId: org.id,
      moduleType: 'Lead',
      name: 'Standard Lead Pipeline',
    },
  });
  console.log('Created Blueprint:', blueprint.id);

  // 3. Create Stages
  const stagesData = [
    { name: 'New', orderIndex: 1, color: '#fde68a', requiredFields: [] },
    { name: 'Contacted', orderIndex: 2, color: '#fed7aa', requiredFields: [] },
    { name: 'Qualified', orderIndex: 3, color: '#c4b5fd', requiredFields: ['industry'] }, // Example Workflow Rule
    { name: 'Proposal', orderIndex: 4, color: '#fbcfe8', requiredFields: ['companySize'] },
    { name: 'Won', orderIndex: 5, color: '#a7f3d0', requiredFields: ['annualRevenue'] },
    { name: 'Lost', orderIndex: 6, color: '#fca5a5', requiredFields: [] },
  ];

  for (const stage of stagesData) {
    await prisma.stage.create({
      data: {
        ...stage,
        blueprintId: blueprint.id,
      },
    });
  }
  console.log('Created Stages');

  // 4. Create Custom Fields
  const fieldsData = [
    {
      name: 'jobTitle',
      label: 'Job Title',
      type: 'text',
      orderIndex: 1,
      isRequired: false,
      options: []
    },
    {
      name: 'companyName',
      label: 'Company Name',
      type: 'text',
      orderIndex: 2,
      isRequired: true,
      options: []
    },
    {
      name: 'industry',
      label: 'Industry',
      type: 'select',
      options: ['Technology', 'Textile', 'Healthcare', 'Finance', 'Manufacturing'],
      orderIndex: 3,
      isRequired: true,
    },
    {
      name: 'companySize',
      label: 'Company Size',
      type: 'select',
      options: ['1-10', '11-50', '51-200', '201-500', '500+'],
      orderIndex: 4,
      isRequired: false,
    },
    {
      name: 'annualRevenue',
      label: 'Annual Revenue',
      type: 'number', // Will map to currency/number in UI
      orderIndex: 5,
      isRequired: false,
      options: []
    },
  ];

  for (const field of fieldsData) {
    await prisma.field.create({
      data: {
        ...field,
        blueprintId: blueprint.id,
      },
    });
  }
  console.log('Created Custom Fields');
  console.log('Seeding complete! Check your Supabase database.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
