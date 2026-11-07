import prisma from './prisma';
import { executeBackendWorkflows } from '../utils/workflowEngine';
import { verifyTaskWork } from './taskVerifier';

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

    // BOSS RULE: Agar task generic hai (koi Related Module nahi aur koi Automation Workflow nahi),
    // toh system task ko touch nahi karega, wo 'Pending' me hi rahega!
    const hasRelatedModule = task.relatedModule && task.relatedModule.toLowerCase() !== 'none';
    const hasAutomation = task.taskAutomation && task.taskAutomation.toLowerCase() !== 'none';

    if (!hasRelatedModule && !hasAutomation) {
      console.log(`[Delay Scheduler] Task "${task.taskName}" is a Generic Standalone task (None / None). Leaving in current stage.`);
      return; // ⛔ Yahi se return! Na Completed me jayega, na Overdue me, na koi note dalegi!
    }


    // 1. Agar task me koi custom Task Automation attached hai to use execute karo
    if (task.taskAutomation && task.taskAutomation !== 'None') {
      console.log(`[Delay Scheduler] Executing assigned Task Automation: ${task.taskAutomation}`);
      await executeBackendWorkflows(task.organizationId, 'Task', 'DueTimeReached', task);
      return; // Custom script ne apna decision khud le liya hai!
    }

    // 2. Universal Audit Verification (AuditLog se check karo kaam hua ya nahi):
    const auditResult = await verifyTaskWork(task);

    if (auditResult.verified && completedStage) {
      // Work verified from AuditLog -> Move to Completed
      const updatedNotes = appendSystemNote(
        task.notes,
        `✅ [System Verified]: ${auditResult.summary}`
      );
      await prisma.task.update({
        where: { id: task.id },
        data: {
          stageId: completedStage.id,
          endDateTime: new Date(),
          completionSource: 'System Auto-Verified',
          notes: updatedNotes
        }
      });
      console.log(`✅ [Delay Scheduler] Task "${task.taskName}" verified & marked as COMPLETED!`);
    } else if (overdueStage) {
      // Work not found or deadline passed -> Move to Overdue
      const updatedNotes = appendSystemNote(
        task.notes,
        `⚠️ [Deadline Reached]: ${auditResult.reason || 'Moved to Overdue at due time.'}`
      );
      await prisma.task.update({
        where: { id: task.id },
        data: {
          stageId: overdueStage.id,
          notes: updatedNotes
        }
      });
      console.log(`❌ [Delay Scheduler] Task "${task.taskName}" marked as OVERDUE!`);
    }

  } catch (error) {
    console.error("[Delay Scheduler] Error in runTaskAudit:", error);
  }
}
