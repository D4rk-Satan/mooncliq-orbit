import prisma from './prisma';

/**
 * Universal Activity & Audit Logger
 * Records actions across any module (Lead, Deal, Task, CustomModule, etc.)
 */
export async function logActivity({
  organizationId,
  moduleType = 'Lead',
  recordId,
  userId = null,
  userEmail = null,
  actionType,
  details = {}
}) {
  try {
    if (!organizationId || !recordId || !actionType) return null;

    return await prisma.auditLog.create({
      data: {
        organizationId,
        moduleType,
        recordId: String(recordId),
        userId: userId ? String(userId) : null,
        userEmail: userEmail ? String(userEmail) : null,
        actionType,
        details
      }
    });
  } catch (err) {
    console.error("[AuditLogger] Error logging activity:", err);
    return null;
  }
}

