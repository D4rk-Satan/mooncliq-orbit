import prisma from './prisma';

/**
 * Universal Task Work Verifier
 * Checks if the assigned rep actually performed verifiable work
 * in AuditLog between task.startDateTime (or createdAt) and task.dueDateTime.
 *
 * Covers:
 * 1. Linked Records (Lead, Deal, Account, CustomModule, etc.)
 * 2. Automated Target tasks (Lead movements / activity count)
 * 3. Generic standalone tasks
 */
export async function verifyTaskWork(task) {
  try {
    if (!task) return { verified: false, reason: 'Task not found' };

    const startTime = task.startDateTime ? new Date(task.startDateTime) : new Date(task.createdAt);
    const endTime = task.dueDateTime ? new Date(task.dueDateTime) : new Date();

    // -------------------------------------------------------------
    // SCENARIO 1: Linked Record Task (Lead, Deal, CustomModule, etc.)
    // -------------------------------------------------------------
    if (task.relatedModule && task.relatedRecordId) {
      const activity = await prisma.auditLog.findFirst({
        where: {
          organizationId: task.organizationId,
          recordId: String(task.relatedRecordId),
          createdAt: {
            gte: startTime,
            lte: endTime
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (activity) {
        return {
          verified: true,
          actionType: activity.actionType,
          summary: `Verified via ${activity.actionType} on ${task.relatedModule} by ${activity.userEmail || 'Rep'}`,
          auditId: activity.id
        };
      } else {
        return {
          verified: false,
          reason: `No activity recorded on linked ${task.relatedModule} between start & due date.`
        };
      }
    }

    // -------------------------------------------------------------
    // SCENARIO 2: Target-Based Task (Audit count check)
    // -------------------------------------------------------------
    if (task.taskAutomation && task.taskAutomation !== 'None') {
      const repActivitiesCount = await prisma.auditLog.count({
        where: {
          organizationId: task.organizationId,
          OR: [
            ...(task.owner ? [{ userEmail: task.owner }, { userId: task.owner }] : [])
          ],
          createdAt: {
            gte: startTime,
            lte: endTime
          }
        }
      });

      const target = 10;
      if (repActivitiesCount >= target) {
        return {
          verified: true,
          summary: `Target Met: Rep completed ${repActivitiesCount}/${target} actions.`,
          count: repActivitiesCount
        };
      } else {
        return {
          verified: false,
          reason: `Target Missed: Rep only completed ${repActivitiesCount}/${target} actions.`,
          count: repActivitiesCount
        };
      }
    }

    // -------------------------------------------------------------
    // SCENARIO 3: Generic Standalone Task (No linked module & No target)
    // -------------------------------------------------------------
    return {
      verified: true,
      summary: 'Generic task - Completed as assigned.'
    };

  } catch (error) {
    console.error("[TaskVerifier] Error verifying task:", error);
    return { verified: false, reason: 'Verification error occurred' };
  }
}

