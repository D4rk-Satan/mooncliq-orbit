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
      if (!fieldNames.includes('priority')) {
        await prisma.field.create({
          data: {
            blueprintId: bp.id,
            name: 'priority',
            label: 'Priority',
            type: 'select',
            isRequired: true,
            isSystemField: true,
            sectionName: 'General Information',
            orderIndex: 12,
            options: ['Low', 'Medium', 'High']
          }
        });
      } else {
        await prisma.field.updateMany({
          where: { blueprintId: bp.id, name: 'priority' },
          data: { sectionName: 'General Information' }
        });
      }

      if (!fieldNames.includes('assignedBy')) {
        await prisma.field.create({
          data: {
            blueprintId: bp.id,
            name: 'assignedBy',
            label: 'Assigned By',
            type: 'text',
            isRequired: false,
            isSystemField: true,
            sectionName: 'General Information',
            orderIndex: 13
          }
        });
      } else {
        await prisma.field.updateMany({
          where: { blueprintId: bp.id, name: 'assignedBy' },
          data: { sectionName: 'General Information' }
        });
      }

      if (!fieldNames.includes('relatedModule')) {
        await prisma.field.create({
          data: {
            blueprintId: bp.id,
            name: 'relatedModule',
            label: 'Related Module',
            type: 'select',
            isRequired: false,
            isSystemField: true,
            sectionName: 'General Information',
            orderIndex: 14,
            options: ['Lead', 'Deal', 'Account', 'Product']
          }
        });
      } else {
        await prisma.field.updateMany({
          where: { blueprintId: bp.id, name: 'relatedModule' },
          data: { sectionName: 'General Information' }
        });
      }
      
      // Reset layout config to make it regenerate automatically in the frontend
      await prisma.blueprint.update({
        where: { id: bp.id },
        data: { layoutConfig: null }
      });

      // Update stages for Task
      const newStages = ['Not Started', 'In-Progress', 'Overdue', 'Completed'];

      const currentStages = await prisma.stage.findMany({
        where: { blueprintId: bp.id }
      });

      // If we don't have the exact new stages, we should try to map them or add them
      for (let i = 0; i < newStages.length; i++) {
        const existingStage = currentStages[i];
        if (existingStage) {
          await prisma.stage.update({
            where: { id: existingStage.id },
            data: {
              name: newStages[i],
              color: i === 0 ? '#7a91b1ff' : i === 1 ? '#3b82f6' : i === 2 ? '#ef4444' : '#22c55e'
            }
          });
        } else {
          await prisma.stage.create({
            data: {
              blueprintId: bp.id,
              name: newStages[i],
              orderIndex: i + 1,
              color: i === 0 ? '#7a91b1ff' : i === 1 ? '#3b82f6' : i === 2 ? '#ef4444' : '#22c55e'
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Tasks fixed' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
