import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function GET(request) {
  try {
    const blueprints = await prisma.blueprint.findMany({
      where: { moduleType: 'Task' }
    });

    for (const bp of blueprints) {
      const existingFields = await prisma.field.findMany({
        where: { blueprintId: bp.id }
      });
      
      const fieldNames = existingFields.map(f => f.name);

      if (!fieldNames.includes('owner')) {
        await prisma.field.create({
          data: {
            blueprintId: bp.id,
            name: 'owner',
            label: 'Assign To (Owner)',
            type: 'text',
            isRequired: false,
            isSystemField: true,
            sectionName: 'General Information',
            orderIndex: 10
          }
        });
      }

      if (!fieldNames.includes('stageId')) {
        await prisma.field.create({
          data: {
            blueprintId: bp.id,
            name: 'stageId',
            label: 'Status',
            type: 'text',
            isRequired: false,
            isSystemField: true,
            sectionName: 'General Information',
            orderIndex: 11
          }
        });
      }

      if (fieldNames.includes('endDateTime')) {
        await prisma.field.deleteMany({
          where: { blueprintId: bp.id, name: 'endDateTime' }
        });
      }
    }
    
    return NextResponse.json({ success: true, message: 'Tasks fixed' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
