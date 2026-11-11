import prisma from './prisma';
import { executeBackendWorkflows } from '../utils/workflowEngine';
import { verifyTaskWork } from './taskVerifier';

// Local dev & server in-memory timers map
const activeTimers = new Map();
const activeAlertTimers = new Map();

/**
 * Schedules a precise one-time execution for a task at its exact dueDateTime.
 * 
 * @param {object} task - The Task database record
 */
export async function scheduleTaskDueCheck(task) {
  if (!task || !task.dueDateTime) return;

  const targetTime = new Date(task.dueDateTime).getTime();
  const now = Date.now();
  const delayMs = targetTime - now;

  // Agar task pehle se hi Overdue ya Completed hai, to timer mat lagao
  if (delayMs <= 0) {
    console.log(`[Delay Scheduler] Task ${task.id} dueDateTime already passed. Running immediate audit.`);
    runTaskAudit(task.id);
    return;
  }

  // Clear existing timer if task was rescheduled
  if (activeTimers.has(task.id)) {
    clearTimeout(activeTimers.get(task.id));
    activeTimers.delete(task.id);
  }

  console.log(`[Delay Scheduler] ⏱️ Timer locked for Task "${task.taskName}" (${task.id}) in ${Math.round(delayMs / 1000)}s at ${new Date(targetTime).toLocaleTimeString()}`);

  // In Local Development & Node server: Precision in-memory timer
  // (In AWS production, this seamlessly bridges with AWS EventBridge Scheduler)
  const timer = setTimeout(async () => {
    try {
      console.log(`[Delay Scheduler] 🔔 ALARM FIRED for Task "${task.taskName}" at exact due time!`);
      await runTaskAudit(task.id);
    } catch (err) {
      console.error(`[Delay Scheduler] Error running audit for task ${task.id}:`, err);
    } finally {
      activeTimers.delete(task.id);
    }
  }, delayMs);

  activeTimers.set(task.id, timer);
}

/**
 * Schedules a precise reminder alert notification based on the user's selected 'alert' option.
 * Zero polling, zero cron jobs - purely millisecond event-driven!
 * 
 * @param {object} task - The Task database record
 */
export async function scheduleTaskAlert(task) {
  if (!task || !task.dueDateTime) return;

  const alertOption = (task.alert || '').trim().toLowerCase();

  // Clear existing alert timer for this task if it was updated/rescheduled
  if (activeAlertTimers.has(task.id)) {
    clearTimeout(activeAlertTimers.get(task.id));
    activeAlertTimers.delete(task.id);
  }

  // If user selected None or empty, no alert needed
  if (!alertOption || alertOption === 'none') {
    return;
  }

  // Calculate offset in minutes strictly as chosen by the user
  let offsetMinutes = 0;
  if (alertOption.includes('5 min')) offsetMinutes = 5;
  else if (alertOption.includes('15 min')) offsetMinutes = 15;
  else if (alertOption.includes('30 min')) offsetMinutes = 30;
  else if (alertOption.includes('1 hour') || alertOption.includes('60 min')) offsetMinutes = 60;
  else if (alertOption.includes('1 day') || alertOption.includes('24 hour')) offsetMinutes = 1440;
  else return; // Unrecognized format

  const dueTime = new Date(task.dueDateTime).getTime();
  const alertTargetTime = dueTime - (offsetMinutes * 60 * 1000);
  const now = Date.now();
  const delayMs = alertTargetTime - now;

  // Agar alert ka time nikal chuka hai, timer mat lagao
  if (delayMs <= 0) {
    return;
  }

  console.log(`[Alert Scheduler] 🔔 Alert armed for Task "${task.taskName}" (${task.id}) in ${Math.round(delayMs / 1000)}s for alert: "${task.alert}"`);

  const alertTimer = setTimeout(async () => {
    try {
      // Re-verify task still exists and is not completed
      const currentTask = await prisma.task.findUnique({
        where: { id: task.id },
        include: { stage: true }
      });

      if (!currentTask || currentTask.stage?.name?.toLowerCase() === 'completed') {
        return; // Completed task par alert fire nahi karna
      }

      // Determine recipient: Assignee first, fallback to '@all'
      let recipientEmail = '@all';
      if (currentTask.owner) {
        const ownerUser = await prisma.user.findFirst({
          where: {
            organizationId: currentTask.organizationId,
            OR: [
              { email: { equals: currentTask.owner, mode: 'insensitive' } },
              { nickname: { equals: currentTask.owner, mode: 'insensitive' } },
              { name: { equals: currentTask.owner, mode: 'insensitive' } }
            ]
          }
        });
        if (ownerUser?.email) {
          recipientEmail = ownerUser.email;
        }
      }

      const alertLabel = task.alert;
      await prisma.notification.create({
        data: {
          organizationId: currentTask.organizationId,
          userEmail: recipientEmail,
          title: `⏰ Task Reminder: ${currentTask.taskName}`,
          message: `Task is due in ${alertLabel}. Please review your pending actions.`,
          type: 'TASK_ALERT',
          actionUrl: `/task`,
          isRead: false
        }
      });

      console.log(`[Alert Scheduler] ✅ Alert notification delivered for Task "${currentTask.taskName}" to ${recipientEmail}`);
    } catch (err) {
      console.error(`[Alert Scheduler] Error dispatching alert for task ${task.id}:`, err);
    } finally {
      activeAlertTimers.delete(task.id);
    }
  }, delayMs);

  activeAlertTimers.set(task.id, alertTimer);
}

/**
 * Helper to safely append a system note into task.notes without breaking
 * existing JSON timeline format or legacy plain-text notes.
 */
function appendSystemNote(existingNotes, noteText) {
  let notesArray = [];

  if (existingNotes) {
    if (Array.isArray(existingNotes)) {
      notesArray = [...existingNotes];
    } else if (typeof existingNotes === 'string') {
      try {
        const parsed = JSON.parse(existingNotes);
        if (Array.isArray(parsed)) {
          notesArray = parsed;
        } else {
          notesArray = [{
            id: 'legacy-1',
            text: String(existingNotes),
            author: 'System Note',
            createdAt: new Date().toISOString()
          }];
        }
      } catch (e) {
        notesArray = [{
          id: 'legacy-1',
          text: String(existingNotes),
          author: 'System Note',
          createdAt: new Date().toISOString()
        }];
      }
    }
  }

  notesArray.push({
    id: `sys_${Date.now()}`,
    text: noteText,
    author: 'System Automation',
    createdAt: new Date().toISOString()
  });

  return JSON.stringify(notesArray);
}
/**
 * Runs the audit logic when dueDateTime arrives:
 * Follows the 4-case matrix:
 * Case-1, 3, 4 -> Move to Overdue with completionSource = 'Automatic'
 * Case-2 -> Run Task Automation with fallback to Completed and completionSource = 'Automatic'
 */
export async function runTaskAudit(taskId) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        stage: true,
        blueprint: { include: { stages: true } }
      }
    });

    if (!task) return;

    // Do nothing if already Completed or Overdue
    const currentStageName = task.stage?.name?.toLowerCase() || '';
    if (currentStageName === 'completed' || currentStageName === 'overdue') {
      console.log(`[Delay Scheduler] Task ${task.id} already closed (${currentStageName}). Skipping.`);
      return;
    }

    const stages = task.blueprint?.stages || [];
    const completedStage = stages.find(s => s.name?.toLowerCase() === 'completed');
    const overdueStage = stages.find(s => s.name?.toLowerCase() === 'overdue');

    const hasRelatedModule = Boolean(task.relatedModule && task.relatedModule.trim().toLowerCase() !== 'none');
    const hasAutomation = Boolean(task.taskAutomation && task.taskAutomation.trim().toLowerCase() !== 'none');

    // Case-2: Both Related Module and Task Automation are selected
    if (hasRelatedModule && hasAutomation) {
      console.log(`[Delay Scheduler] Executing assigned Task Automation: "${task.taskAutomation}" for Task ${task.id}`);
      await executeBackendWorkflows(task.organizationId, 'Task', 'DueTimeReached', task);

      // Re-verify task stage after script execution
      const updatedTask = await prisma.task.findUnique({
        where: { id: task.id },
        include: { stage: true }
      });

      // Safety Fallback: If script did NOT update the stage, mark Completed to prevent duplicate runs
      if (updatedTask && updatedTask.stageId === task.stageId && completedStage) {
        await prisma.task.update({
          where: { id: task.id },
          data: {
            stageId: completedStage.id,
            endDateTime: new Date(),
            completionSource: 'Automatic',
            notes: appendSystemNote(task.notes, `✅ [Automatic Completed]: Automation "${task.taskAutomation}" executed.`)
          }
        });
        console.log(`✅ [Delay Scheduler] Task "${task.taskName}" auto-completed (Safety Fallback) after running "${task.taskAutomation}".`);
      } else if (updatedTask && !updatedTask.completionSource) {
        await prisma.task.update({
          where: { id: task.id },
          data: { completionSource: 'Automatic' }
        });
      }
      return;
    }

    // Case-1 (none/none), Case-3 (selected/none), Case-4 (none/selected):
    // Move to Overdue with completionSource = 'Automatic'
    if (overdueStage) {
      const updatedNotes = appendSystemNote(
        task.notes,
        `⚠️ [Automatic Overdue]: Due date passed without completion.`
      );
      await prisma.task.update({
        where: { id: task.id },
        data: {
          stageId: overdueStage.id,
          completionSource: 'Automatic',
          notes: updatedNotes
        }
      });
      console.log(`❌ [Delay Scheduler] Task "${task.taskName}" marked as OVERDUE with completionSource = Automatic.`);
    }

  } catch (error) {
    console.error("[Delay Scheduler] Error in runTaskAudit:", error);
  }
}
