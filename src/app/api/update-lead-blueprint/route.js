import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function GET() {
  try {
    console.log("Starting DB update for existing Lead Blueprints...");

    const blueprints = await prisma.blueprint.findMany({
      where: { moduleType: 'Lead' },
      include: { fields: true }
    });

    if (blueprints.length === 0) {
      return NextResponse.json({ message: "No existing Lead blueprints found." });
    }

    let updatedCount = 0;

    for (const bp of blueprints) {
      // 1. Update Section Name 'Classification' -> 'Classification & Sales Process'
      await prisma.field.updateMany({
        where: { blueprintId: bp.id, sectionName: 'Classification' },
        data: { sectionName: 'Classification & Sales Process' }
      });

      // 2. Update 'owner' field type to 'User'
      await prisma.field.updateMany({
        where: { blueprintId: bp.id, name: 'owner' },
        data: { type: 'User' }
      });

      // 3. Update 'leadSource' options
      const leadSourceField = bp.fields.find(f => f.name === 'leadSource');
      if (leadSourceField) {
        await prisma.field.update({
          where: { id: leadSourceField.id },
          data: { options: ['Website', 'Referral', 'Campaign', 'Cold Call', 'Event', 'Other'] }
        });
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
        }
      }
      updatedCount++;
    }

    return NextResponse.json({ message: `Successfully updated ${updatedCount} existing Lead Blueprints!` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update DB" }, { status: 500 });
  }
}
