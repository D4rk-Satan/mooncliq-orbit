import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUser } from '../../../lib/auth';
import { executeBiDirectionalSync } from '../../../lib/syncLookups';
import { executeBackendWorkflows } from '../../../utils/workflowEngine';

export async function POST(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.profile?.canAccessSettings && !user.profile?.permissions?.Task?.create) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to create Tasks" }, { status: 403 });
    }

    const body = await req.json();
    const { taskName, startDateTime, dueDateTime, endDateTime, repeat, alert, notes, customData, blueprintId } = body;

    if (!taskName || !blueprintId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find the initial stage for this blueprint (Order Index 0)
    let initialStage = await prisma.stage.findFirst({
      where: { blueprintId, orderIndex: 0 }
    });

    // Fallback if no orderIndex 0 exists
    if (!initialStage) {
      initialStage = await prisma.stage.findFirst({
        where: { blueprintId }
      });
    }

    if (!initialStage) {
      initialStage = await prisma.stage.create({
        data: {
          name: 'Default',
          blueprintId,
          orderIndex: 0,
          color: '#e2e8f0'
        }
      });
    }

    const task = await prisma.task.create({
      data: {
        organizationId: user.organizationId,
        blueprintId,
        stageId: initialStage.id,
        taskName,
        startDateTime: startDateTime ? new Date(startDateTime) : null,
        dueDateTime: dueDateTime ? new Date(dueDateTime) : null,
        endDateTime: endDateTime ? new Date(endDateTime) : null,
        repeat,
        alert,
        notes,
        customData: customData || {}
      }
    });

    await executeBiDirectionalSync(user.organizationId, 'Task', task, blueprintId);

    // Execute Backend Workflows (Async)
    executeBackendWorkflows(user.organizationId, 'Task', 'Created', task);

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.profile?.canAccessSettings && !user.profile?.permissions?.Task?.view) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view Tasks" }, { status: 403 });
    }

    let tasks = await prisma.task.findMany({
      where: { organizationId: user.organizationId },
      include: { stage: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!user.profile?.canAccessSettings && user.profile?.permissions?.Task?.visibility === 'private') {
      tasks = tasks.filter(t => {
        let customData = t.customData;
        if (typeof customData === 'string') {
          try { customData = JSON.parse(customData); } catch (e) { customData = {}; }
        }
        return customData?.owner === user.email;
      });
    }

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!user.profile?.canAccessSettings && !user.profile?.permissions?.Task?.edit) {
      return NextResponse.json({ error: "Forbidden: No permission to edit Tasks" }, { status: 403 });
    }

    const data = await req.json();
    const { taskId, stageId, customData, tags, transitionId, ...standardFields } = data;

    if (!taskId) return NextResponse.json({ error: "Missing taskId" }, { status: 400 });

    let updateData = { ...standardFields };
    if (stageId) updateData.stageId = stageId;
    if (customData) updateData.customData = customData;

    // Format dates correctly for Prisma
    if (updateData.startDateTime) updateData.startDateTime = new Date(updateData.startDateTime);
    if (updateData.dueDateTime) updateData.dueDateTime = new Date(updateData.dueDateTime);
    if (updateData.endDateTime) updateData.endDateTime = new Date(updateData.endDateTime);

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: { stage: true }
    });

    if (typeof executeBackendWorkflows === "function") {
      executeBackendWorkflows(user.organizationId, 'Task', 'Edited', updatedTask);
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error updating Task:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
