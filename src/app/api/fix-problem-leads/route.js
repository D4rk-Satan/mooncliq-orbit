import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const validStageNames = ['New', 'Contacted', 'Qualified', 'Close Won', 'Close Lost', 'Junk'];
    
    // 1. Find invalid stages
    const invalidStages = await prisma.stage.findMany({
      where: {
        blueprint: { moduleType: 'Lead' },
        name: { notIn: validStageNames }
      }
    });

    const invalidStageIds = invalidStages.map(s => s.id);

    if (invalidStageIds.length === 0) {
      return NextResponse.json({ message: "No invalid stages found." });
    }

    // 2. Find the "New" stage (or create one if missing) to reassign problem leads
    let newStage = await prisma.stage.findFirst({
      where: {
        blueprint: { moduleType: 'Lead' },
        name: 'New'
      }
    });

    if (!newStage) {
      return NextResponse.json({ error: "No 'New' stage found to reassign leads to." }, { status: 500 });
    }

    // 3. Reassign leads that are stuck in invalid stages
    const updatedLeads = await prisma.lead.updateMany({
      where: { stageId: { in: invalidStageIds } },
      data: { stageId: newStage.id }
    });

    // 4. Now safely delete the invalid stages
    const deletedStages = await prisma.stage.deleteMany({
      where: { id: { in: invalidStageIds } }
    });

    return NextResponse.json({ 
      message: "Successfully fixed problem leads and deleted invalid stages.",
      leadsReassigned: updatedLeads.count,
      stagesDeleted: deletedStages.count,
      invalidStageNames: invalidStages.map(s => s.name)
    });
  } catch (error) {
    console.error("Error fixing problem leads:", error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
