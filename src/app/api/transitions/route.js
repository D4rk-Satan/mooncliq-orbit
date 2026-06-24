import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const blueprintId = searchParams.get('blueprintId');

    if (!blueprintId) {
      return NextResponse.json({ error: "Missing blueprintId" }, { status: 400 });
    }

    const transitions = await prisma.transition.findMany({
      where: { blueprintId },
      include: {
        fromStages: true,
        toStage: true
      }
    });

    return NextResponse.json(transitions);
  } catch (error) {
    console.error("Error fetching transitions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

  export async function POST(request) {
    try {
      const data = await request.json();
      const { name, fromStageIds, isGlobal, toStageId, blueprintId, requiredFields, necessaryFields } = data;
  
      if (!name || !toStageId || !blueprintId) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
  
      const newTransition = await prisma.transition.create({
        data: {
          name,
          toStageId,
          blueprintId,
          requiredFields: requiredFields || [],
          necessaryFields: necessaryFields || [],
          isGlobal: isGlobal || false,
          fromStages: fromStageIds && fromStageIds.length > 0 ? {
            connect: fromStageIds.map(id => ({ id }))
          } : undefined
        }
      });

    return NextResponse.json(newTransition);
  } catch (error) {
    console.error("Error creating transition:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.transition.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting transition:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
