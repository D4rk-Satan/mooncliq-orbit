import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function POST(request) {
  try {
    const data = await request.json();
    const { name, label, type, options, blueprintId, isRequired } = data;

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
        orderIndex: nextOrder
      }
    });

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
