import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUser } from '../../../lib/auth';

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
      return NextResponse.json({ error: "No stages found in this blueprint. Add a stage in Settings." }, { status: 400 });
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
        customData
      }
    });

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
          try { customData = JSON.parse(customData); } catch(e) { customData = {}; }
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
