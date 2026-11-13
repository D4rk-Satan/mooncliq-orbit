import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUser } from '../../../lib/auth';
import { executeBiDirectionalSync } from '../../../lib/syncLookups';
import { executeBackendWorkflows } from '../../../utils/workflowEngine';
import { withPermission } from '../../../lib/rbac';
import { scheduleTaskDueCheck, scheduleTaskAlert } from '../../../lib/delayScheduler';
import { getSubordinateUserIds, getUserIdentifiersList } from '../../../lib/hierarchy';

export const POST = withPermission('Task', 'create', async (request, user) => {
  try {

    const body = await request.json();
    const { taskName, startDateTime, dueDateTime, endDateTime, repeat, alert, notes, customData, blueprintId, owner, priority, relatedModule, relatedRecordId, taskAutomation } = body;

    if (!taskName || !blueprintId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validation: Start Date must be before Due Date
    if (startDateTime && dueDateTime) {
      if (new Date(startDateTime) > new Date(dueDateTime)) {
        return NextResponse.json({ error: "Start Date cannot be after Due Date" }, { status: 400 });
      }
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
        owner, // Auto-saving owner
        assignedBy: user.id, // Automatically tracking who created the task
        priority,
        relatedModule,
        relatedRecordId,
        taskAutomation: taskAutomation || null,
        customData: customData || {}
      }
    });

    // Create Audit Log for Task Creation
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        moduleType: 'Task',
        recordId: task.id,
        userId: user.id,
        userEmail: user.email,
        actionType: 'TASK_CREATED',
        details: { taskName: task.taskName, priority: task.priority, stageId: task.stageId }
      }
    });


    await executeBiDirectionalSync(user.organizationId, 'Task', task, blueprintId);

    // Execute Backend Workflows (Async)
    executeBackendWorkflows(user.organizationId, 'Task', 'Created', task);

    // Lock Exact-Time Delay Trigger for Due Date
    scheduleTaskDueCheck(task);
    scheduleTaskAlert(task);

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

export const GET = withPermission('Task', 'view', async (request, user) => {
  try {

    let tasks = await prisma.task.findMany({
      where: { organizationId: user.organizationId },
      include: { stage: true },
      orderBy: { createdAt: 'desc' }
    });

    const taskVisibility = user.profile?.permissions?.Task?.visibility || 'public';

    if (!user.profile?.canAccessSettings && (taskVisibility === 'private' || taskVisibility === 'hierarchy')) {
      // Current user ke saare possible identifiers (id, email, name, nickname)
      const allowedIdentifiers = new Set([
        user.id,
        user.email,
        user.name,
        user.profile?.nickname,
        user.nickname
      ].filter(Boolean).map(val => String(val).trim().toLowerCase()));

      let subordinateUserIds = [];
      if (taskVisibility === 'hierarchy') {
        subordinateUserIds = await getSubordinateUserIds(user.id, user.organizationId);
        if (subordinateUserIds.length > 0) {
          const subIdentifiers = await getUserIdentifiersList(subordinateUserIds);
          subIdentifiers.forEach(id => allowedIdentifiers.add(id));
        }
      }

      tasks = tasks.filter(t => {
        let customData = t.customData;
        if (typeof customData === 'string') {
          try { customData = JSON.parse(customData); } catch (e) { customData = {}; }
        }

        const taskOwner = String(t.owner || '').trim().toLowerCase();
        const customOwner = String(customData?.owner || '').trim().toLowerCase();

        // 1. User is task ka creator/assigner hai
        const isCreator = t.assignedBy === user.id;

        // 2. Agar hierarchy enabled hai aur task kisi subordinate ne banaya hai
        const isCreatedBySubordinate = subordinateUserIds.includes(t.assignedBy);

        // 3. Agar task ka owner user ya uske kisi subordinate ke identifier se match karta hai
        const isAllowedOwner = Boolean(
          (taskOwner && allowedIdentifiers.has(taskOwner)) ||
          (customOwner && allowedIdentifiers.has(customOwner))
        );

        return isCreator || isCreatedBySubordinate || isAllowedOwner;
      });
    }

    // --- ENRICH WITH HUMAN NICKNAMES (assignedByName & lastModifiedByName) ---
    const userIds = [...new Set([
      ...tasks.map(t => t.assignedBy).filter(Boolean),
      ...tasks.map(t => t.lastModifiedById).filter(Boolean)
    ])];

    let userMap = {};
    if (userIds.length > 0) {
      const dbUsers = await prisma.user.findMany({
        where: { id: { in: userIds } },
        include: { profile: true }
      });
      dbUsers.forEach(u => {
        userMap[u.id] = u.profile?.nickname || u.name || u.email?.split('@')[0] || u.email;
      });
    }

    const enrichedTasks = tasks.map(t => ({
      ...t,
      assignedByName: userMap[t.assignedBy] || t.assignedBy,
      lastModifiedByName: userMap[t.lastModifiedById] || null
    }));

    return NextResponse.json(enrichedTasks);


  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

export const PATCH = withPermission('Task', 'edit', async (request, user) => {
  try {


    const data = await request.json();
    const { taskId, stageId, customData, tags, transitionId, ...standardFields } = data;

    if (!taskId) return NextResponse.json({ error: "Missing taskId" }, { status: 400 });

    // Fetch existing task to check permissions & stage
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId, organizationId: user.organizationId },
      include: { stage: true }
    });
    if (!existingTask) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    // Enforce Permission Matrix: Admin & Creator can edit; Assignee & Others are strictly Read-only
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    const userNick = (user.profile?.nickname || user.nickname || '').toLowerCase();
    const userEmail = (user.email || '').toLowerCase();
    const taskAssignedBy = String(existingTask.assignedBy || '').toLowerCase();
    const isCreator = Boolean(
      taskAssignedBy && (
        taskAssignedBy === user.id.toLowerCase() ||
        taskAssignedBy === userEmail ||
        taskAssignedBy === userNick
      )
    );

    // If not Admin and not Creator, only stage transitions or notes can be touched (Blueprint operations)
    if (!isAdmin && !isCreator) {
      const allowedKeys = ['stageId', 'notes', 'transitionId', 'tags'];
      const attemptedKeys = Object.keys(standardFields).filter(k => !allowedKeys.includes(k));
      if (attemptedKeys.length > 0) {
        return NextResponse.json({
          error: "Permission Denied: Only Org Admin or Creator can edit this task"
        }, { status: 403 });
      }
    }

    let updateData = { ...standardFields };
    if (stageId) updateData.stageId = stageId;
    if (customData) updateData.customData = customData;

    // Save tags inside customData for Tasks
    if (tags !== undefined) {
      let currentCustom = {};
      try {
        currentCustom = typeof updateData.customData === 'string'
          ? JSON.parse(updateData.customData || '{}')
          : (updateData.customData || {});
      } catch (e) { currentCustom = {}; }
      updateData.customData = { ...currentCustom, tags };
    }

    // Format dates correctly for Prisma
    if (updateData.startDateTime) updateData.startDateTime = new Date(updateData.startDateTime);
    if (updateData.dueDateTime) updateData.dueDateTime = new Date(updateData.dueDateTime);
    if (updateData.endDateTime) updateData.endDateTime = new Date(updateData.endDateTime);

    // Validation: Start Date must be before Due Date (for Updates)
    if (updateData.startDateTime || updateData.dueDateTime) {
      const existingTask = await prisma.task.findUnique({ where: { id: taskId }, select: { startDateTime: true, dueDateTime: true } });
      if (existingTask) {
        const finalStartDate = updateData.startDateTime || existingTask.startDateTime;
        const finalDueDate = updateData.dueDateTime || existingTask.dueDateTime;
        if (finalStartDate && finalDueDate && new Date(finalStartDate) > new Date(finalDueDate)) {
          return NextResponse.json({ error: "Start Date cannot be after Due Date" }, { status: 400 });
        }
      }
    }

    // Auto-fill End Date & Completion Source if stage is changed manually
    let isTransitioningToCompleted = false;
    if (updateData.stageId) {
      const newStage = await prisma.stage.findUnique({ where: { id: updateData.stageId } });
      const prevStageName = existingTask.stage?.name?.toLowerCase() || '';

      // Whenever a user updates the stage manually, set completionSource = 'Manual'
      updateData.completionSource = 'Manual';

      if (newStage && newStage.name === 'Completed') {
        updateData.endDateTime = new Date();
        // Only trigger repeat spawn if it was NOT already completed before
        if (prevStageName !== 'completed') {
          isTransitioningToCompleted = true;
        }
      }
    }


    // Create Audit Log for Task Modification
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        moduleType: 'Task',
        recordId: taskId,
        userId: user.id,
        userEmail: user.email,
        actionType: 'TASK_UPDATED',
        details: updateData
      }
    });
    // Update who modified the task
    updateData.lastModifiedById = user.id;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: { stage: true }
    });

    if (typeof executeBackendWorkflows === "function") {
      executeBackendWorkflows(user.organizationId, 'Task', 'Edited', updatedTask);
    }

    // Re-lock Exact-Time Delay Trigger if Due Date was changed or updated
    scheduleTaskDueCheck(updatedTask);
    scheduleTaskAlert(updatedTask);

    // 🔁 RECURRING TASK GENERATOR: If completed and has repeat configured
    let spawnedTask = null;
    const repeatRule = (updatedTask.repeat || existingTask.repeat || '').toLowerCase().trim();

    if (isTransitioningToCompleted && repeatRule && repeatRule !== 'none') {
      try {
        const calculateNextDate = (baseDate, rule) => {
          if (!baseDate) return null;
          const d = new Date(baseDate);
          if (isNaN(d.getTime())) return null;

          if (rule === 'daily') d.setDate(d.getDate() + 1);
          else if (rule === 'weekly') d.setDate(d.getDate() + 7);
          else if (rule === 'monthly') d.setMonth(d.getMonth() + 1);
          else if (rule === 'yearly') d.setFullYear(d.getFullYear() + 1);
          return d;
        };

        const nextStart = calculateNextDate(existingTask.startDateTime || new Date(), repeatRule);
        const nextDue = calculateNextDate(existingTask.dueDateTime || new Date(), repeatRule);

        // Find or create 'Recurring' tag for this organization
        let recurringTag = await prisma.tag.findFirst({
          where: {
            organizationId: user.organizationId,
            moduleType: 'Task',
            name: { equals: 'Recurring', mode: 'insensitive' }
          }
        });

        if (!recurringTag) {
          recurringTag = await prisma.tag.create({
            data: {
              organizationId: user.organizationId,
              moduleType: 'Task',
              name: 'Recurring',
              color: '#6366f1' // Professional indigo
            }
          });
        }

        // Prepare existing tags + append Recurring tag ID
        let childCustom = {};
        try {
          childCustom = typeof existingTask.customData === 'string'
            ? JSON.parse(existingTask.customData || '{}')
            : (existingTask.customData || {});
        } catch (e) { childCustom = {}; }

        const existingTagIds = Array.isArray(childCustom.tags) ? childCustom.tags : [];
        const nextTags = Array.from(new Set([...existingTagIds, recurringTag.id]));
        childCustom.tags = nextTags;

        // Initial stage (Pending / orderIndex 0)
        let initialStage = await prisma.stage.findFirst({
          where: { blueprintId: existingTask.blueprintId, orderIndex: 0 }
        });
        if (!initialStage) {
          initialStage = await prisma.stage.findFirst({
            where: { blueprintId: existingTask.blueprintId, name: 'Pending' }
          });
        }

        if (initialStage && nextDue) {
          spawnedTask = await prisma.task.create({
            data: {
              organizationId: user.organizationId,
              blueprintId: existingTask.blueprintId,
              stageId: initialStage.id,
              taskName: existingTask.taskName,
              startDateTime: nextStart,
              dueDateTime: nextDue,
              repeat: existingTask.repeat,
              alert: existingTask.alert,
              notes: existingTask.notes,
              owner: existingTask.owner,
              assignedBy: existingTask.assignedBy || user.id,
              priority: existingTask.priority,
              relatedModule: existingTask.relatedModule,
              relatedRecordId: existingTask.relatedRecordId,
              taskAutomation: existingTask.taskAutomation,
              customData: childCustom
            },
            include: { stage: true }
          });

          // Schedule exact due check for new task
          scheduleTaskDueCheck(spawnedTask);
          scheduleTaskAlert(spawnedTask);

          // Audit log for recurring spawn
          await prisma.auditLog.create({
            data: {
              organizationId: user.organizationId,
              moduleType: 'Task',
              recordId: spawnedTask.id,
              userId: user.id,
              userEmail: user.email,
              actionType: 'TASK_RECURRED',
              details: {
                parentTaskId: existingTask.id,
                taskName: spawnedTask.taskName,
                repeatRule: existingTask.repeat,
                nextDue: nextDue
              }
            }
          });
        }
      } catch (err) {
        console.error("Failed to auto-spawn recurring task:", err);
      }
    }

    const displayName = user.profile?.nickname || user.name || user.email?.split('@')[0] || user.email;

    return NextResponse.json({
      ...updatedTask,
      lastModifiedByName: displayName,
      spawnedTask: spawnedTask || null
    });

  } catch (error) {
    console.error("Error updating Task:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});
