import prisma from './prisma';
import { executeBackendWorkflows } from '../utils/workflowEngine';

// Local dev & server in-memory timers map
const activeTimers = new Map();

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
 * Runs the audit logic when dueDateTime arrives:
 * If rep completed target -> Completed
 * If not completed -> Overdue
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

    // Agar task pehle hi kisi ne manually Complete kar diya hai to kuch mat karo
    if (task.stage?.name?.toLowerCase() === 'completed') {
      console.log(`[Delay Scheduler] Task ${task.id} already completed. Skipping.`);
      return;
    }

    const stages = task.blueprint?.stages || [];
    const completedStage = stages.find(s => s.name?.toLowerCase() === 'completed');
    const overdueStage = stages.find(s => s.name?.toLowerCase() === 'overdue');

    // 1. Agar task me koi custom Task Automation attached hai to use execute karo
    if (task.taskAutomation && task.taskAutomation !== 'None') {
      console.log(`[Delay Scheduler] Executing assigned Task Automation: ${task.taskAutomation}`);
      await executeBackendWorkflows(task.organizationId, 'Task', 'DueTimeReached', task);
      return; // Custom script ne apna decision khud le liya hai!
    }

    // 2. Default Target Audit (Check if owner moved 10 leads today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let movedLeads = 0;
    if (task.owner) {
      movedLeads = await prisma.lead.count({
        where: {
          organizationId: task.organizationId,
          owner: task.owner,
          updatedAt: { gte: todayStart }
        }
      });
    }

    console.log(`[Delay Scheduler] Rep (${task.owner}) leads moved: ${movedLeads}`);

    // Agar 10 ya usse zyada leads move ki hain:
    if (movedLeads >= 10 && completedStage) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          stageId: completedStage.id,
          endDateTime: new Date(),
          completionSource: 'System Auto-Verified (Target Met)',
          notes: (task.notes ? task.notes + "\n\n" : "") + 
                 `🎉 [System Auto-Verified]: Rep moved ${movedLeads} leads before due time. Task Completed!`
        }
      });
      console.log(`✅ [Delay Scheduler] Task "${task.taskName}" marked as COMPLETED!`);
    } else if (overdueStage) {
      // Agar target meet nahi hua aur due time nikal gaya:
      await prisma.task.update({
        where: { id: task.id },
        data: {
          stageId: overdueStage.id,
          notes: (task.notes ? task.notes + "\n\n" : "") + 
                 `⚠️ [Target Missed]: Rep only moved ${movedLeads}/10 leads. Moved to Overdue at due time.`
        }
      });
      console.log(`❌ [Delay Scheduler] Task "${task.taskName}" marked as OVERDUE!`);
    }

  } catch (error) {
    console.error("[Delay Scheduler] Error in runTaskAudit:", error);
  }
}
