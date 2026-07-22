import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function POST(request) {
  try {
    const data = await request.json();
    const { name, label, type, options, blueprintId, isRequired, targetModule, targetDisplayField, isMultiSelect, isBiDirectional, mappings, relatedListLabel, isPublic, filters } = data;

    // Get the highest orderIndex to append at the end
    const lastField = await prisma.field.findFirst({
      where: { blueprintId },
      orderBy: { orderIndex: 'desc' }
    });
    
    const nextOrder = lastField ? lastField.orderIndex + 1 : 1;

    const newField = await prisma.field.create({
      data: {
        blueprintId,
        name,
        label,
        type,
        options: options || [],
        isRequired: isRequired || false,
        orderIndex: nextOrder,
        targetModule: targetModule || null,
        targetDisplayField: targetDisplayField || null,
        isMultiSelect: isMultiSelect || false,
        isBiDirectional: isBiDirectional || false,
        relatedListLabel: relatedListLabel || null,
        isPublic: isPublic !== undefined ? isPublic : true,
        filters: filters || null,
        mappings: mappings || null
      }
    });

    if (isBiDirectional && targetModule) {
      const currentBlueprint = await prisma.blueprint.findUnique({ where: { id: blueprintId } });
      const targetBp = await prisma.blueprint.findFirst({
        where: {
          organizationId: currentBlueprint.organizationId,
          moduleType: targetModule
        }
      });

      if (targetBp) {
        const reverseName = `related_${currentBlueprint.moduleType.toLowerCase()}s_${Date.now()}`;
        const reverseLabel = `Related ${currentBlueprint.moduleType}s`;
        
        const lastReverseField = await prisma.field.findFirst({
          where: { blueprintId: targetBp.id },
          orderBy: { orderIndex: 'desc' }
        });
        const nextReverseOrder = lastReverseField ? lastReverseField.orderIndex + 1 : 1;

        const reverseField = await prisma.field.create({
          data: {
            blueprintId: targetBp.id,
            name: reverseName,
            label: reverseLabel,
            type: 'lookup',
            targetModule: currentBlueprint.moduleType,
            targetDisplayField: 'name',
            isMultiSelect: true,
            isBiDirectional: true,
            options: [{ reverseOf: newField.id }]
          }
        });

        await prisma.field.update({
          where: { id: newField.id },
          data: {
            options: [...(options || []), { reverseOf: reverseField.id }]
          }
        });
      }
    }

    return NextResponse.json(newField);
  } catch (error) {
    console.error("Error creating field:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Field ID is required" }, { status: 400 });
    }

    await prisma.field.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting field:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
