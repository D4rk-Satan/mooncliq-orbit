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
    // SCENARIO 2: Target-Based Task (Agar workflow me target set ho)
    // -------------------------------------------------------------
    const hasAutomation = task.taskAutomation && task.taskAutomation.toLowerCase() !== 'none';

    if (hasAutomation) {
      // Workflow configuration se target read karo (default 1 action agar target specific task hai)
      let target = null;
      if (typeof task.customData === 'object' && task.customData?.targetCount) {
        target = Number(task.customData.targetCount);
      }

      // Agar target specify kiya gaya hai tabhi count check karo
      if (target && target > 0) {
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
    }

    // -------------------------------------------------------------
    // SCENARIO 3: Generic Standalone Task (None / None)
    // -------------------------------------------------------------
    // Generic task ko auto-verify nahi karna! Rep/User khud manually karega.
    return {
      verified: false,
      reason: 'Standalone task without automated verification criteria.'
    };
  } catch (error) {
    console.error("[TaskVerifier] Error verifying task:", error);
    return { verified: false, reason: 'Verification error occurred' };
  }
}