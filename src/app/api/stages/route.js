import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function POST(request) {
  try {
    const data = await request.json();
    const { name, color, blueprintId } = data;

    // Get the highest orderIndex to append at the end
    const lastStage = await prisma.stage.findFirst({
      where: { blueprintId },
      orderBy: { orderIndex: 'desc' }
    });
    
    const nextOrder = lastStage ? lastStage.orderIndex + 1 : 1;

    const newStage = await prisma.stage.create({
      data: {
        blueprintId,
        name,
        color: color || '#e2e8f0',
        orderIndex: nextOrder,
        requiredFields: []
      }
    });

    return NextResponse.json(newStage);
  } catch (error) {
    console.error("Error creating stage:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Stage ID is required" }, { status: 400 });
    }

    // Check if there are leads in this stage before deleting
    const leadsInStage = await prisma.lead.count({
      where: { stageId: id }
    });

    if (leadsInStage > 0) {
      return NextResponse.json({ 
        error: "Cannot delete stage because there are leads currently in it." 
      }, { status: 400 });
    }

    await prisma.stage.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting stage:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
