import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

/**
 * API Endpoint for orbit.moveStage(moduleType, recordId, targetStageName)
 */
export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { moduleType, recordId, targetStageName } = body;

    if (!moduleType || !recordId || !targetStageName) {
      return NextResponse.json({ error: 'moduleType, recordId, and targetStageName are required' }, { status: 400 });
    }

    const normModule = moduleType.trim();
    const lower = normModule.toLowerCase();

    // 1. Fetch the target stage by name in this tenant's blueprint
    const blueprint = await prisma.blueprint.findFirst({
      where: {
        organizationId: user.organizationId,
        moduleType: normModule
      },
      include: { stages: true }
    });

    if (!blueprint) {
      return NextResponse.json({ error: `Blueprint not found for module ${normModule}` }, { status: 404 });
    }

    const targetStage = blueprint.stages.find(
      s => s.name?.toLowerCase().trim() === targetStageName.toLowerCase().trim()
    );

    if (!targetStage) {
      return NextResponse.json({ 
        error: `Stage '${targetStageName}' not found in ${normModule} pipeline` 
      }, { status: 404 });
    }

    let updatedRecord = null;

    // 2. Update record stage based on Module
    if (lower === 'lead') {
      updatedRecord = await prisma.lead.update({
        where: { id: recordId, organizationId: user.organizationId },
        data: { stageId: targetStage.id },
        include: { stage: true }
      });
    } else if (lower === 'deal') {
      updatedRecord = await prisma.deal.update({
        where: { id: recordId, organizationId: user.organizationId },
        data: { stageId: targetStage.id },
        include: { stage: true }
      });
    } else if (lower === 'task') {
      updatedRecord = await prisma.task.update({
        where: { id: recordId, organizationId: user.organizationId },
        data: { stageId: targetStage.id },
        include: { stage: true }
      });
    } else if (lower === 'account') {
      updatedRecord = await prisma.account.update({
        where: { id: recordId, organizationId: user.organizationId },
        data: { stageId: targetStage.id },
        include: { stage: true }
      });
    } else if (lower === 'product') {
      updatedRecord = await prisma.product.update({
        where: { id: recordId, organizationId: user.organizationId },
        data: { stageId: targetStage.id },
        include: { stage: true }
      });
    } else {
      // Custom Record
      updatedRecord = await prisma.customRecord.update({
        where: { id: recordId, organizationId: user.organizationId },
        data: { stageId: targetStage.id },
        include: { stage: true }
      });
    }

    // 3. Create Audit Log for the stage transition
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        leadId: lower === 'lead' ? recordId : null,
        actionType: 'StageChangedBySDK',
        details: {
          moduleType: normModule,
          recordId,
          newStageId: targetStage.id,
          newStageName: targetStage.name
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully moved to ${targetStage.name}`,
      record: updatedRecord
    });

  } catch (error) {
    console.error('Error in /api/stages/move:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
