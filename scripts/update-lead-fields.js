const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting DB update for existing Lead Blueprints...");
  
  const blueprints = await prisma.blueprint.findMany({
    where: { moduleType: 'Lead' },
    include: { fields: true }
  });

  if (blueprints.length === 0) {
    console.log("No existing Lead blueprints found.");
    return;
  }

  for (const bp of blueprints) {
    console.log(`Processing Blueprint: ${bp.id}`);

    // 1. Update Section Name 'Classification' -> 'Classification & Sales Process'
    await prisma.field.updateMany({
      where: { blueprintId: bp.id, sectionName: 'Classification' },
      data: { sectionName: 'Classification & Sales Process' }
    });
    console.log(" - Updated Section Names");

    // 2. Update 'owner' field type to 'User'
    await prisma.field.updateMany({
      where: { blueprintId: bp.id, name: 'owner' },
      data: { type: 'User' }
    });
    console.log(" - Updated Owner type");

    // 3. Update 'leadSource' options
    const leadSourceField = bp.fields.find(f => f.name === 'leadSource');
    if (leadSourceField) {
      await prisma.field.update({
        where: { id: leadSourceField.id },
        data: { options: ['Website', 'Referral', 'Campaign', 'Cold Call', 'Event', 'Other'] }
      });
      console.log(" - Updated Lead Source Options");
    }

    // 4. Add missing fields if they don't exist
    const fieldsToAdd = [
      { name: 'nextFollowUpDate', label: 'Next Follow-up Date', type: 'Date', isRequired: false, isSystemField: true, sectionName: 'Classification & Sales Process', orderIndex: 14, isHidden: false },
      { name: 'createdAt', label: 'Created Date', type: 'Datetime', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 16, isHidden: true },
      { name: 'lastActivityDate', label: 'Last Activity Date', type: 'Datetime', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 17, isHidden: true },
      { name: 'lastModifiedById', label: 'Last Modified By', type: 'User', isRequired: true, isSystemField: true, sectionName: 'System Fields', orderIndex: 18, isHidden: true }
    ];

    for (const f of fieldsToAdd) {
      if (!bp.fields.some(existingField => existingField.name === f.name)) {
        await prisma.field.create({
          data: {
            blueprintId: bp.id,
            ...f
          }
        });
        console.log(` - Added missing field: ${f.name}`);
      }
    }
  }

  console.log("Successfully updated all existing Lead Blueprints!");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
