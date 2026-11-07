import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { withPermission } from '../../../../lib/rbac';

export async function DELETE(request, context) {
  return withPermission('Task', 'delete', async (req, user) => {
    try {
      const { id } = await context.params;

      // Check task existence, ownership, and stage
      const task = await prisma.task.findUnique({
        where: { id, organizationId: user.organizationId },
        include: { stage: true }
      });

      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      // IRON RULE: Completed tasks can NEVER be deleted by anyone!
      const isCompleted = task.stage?.name?.toLowerCase() === 'completed';
      if (isCompleted) {
        return NextResponse.json({
          error: "Action Denied: Completed tasks are permanently locked and cannot be deleted"
        }, { status: 403 });
      }

      const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
      const userNick = (user.profile?.nickname || user.nickname || '').toLowerCase();
      const userEmail = (user.email || '').toLowerCase();
      const taskAssignedBy = String(task.assignedBy || '').toLowerCase();

      const isCreator = taskAssignedBy && (
        taskAssignedBy === user.id.toLowerCase() ||
        taskAssignedBy === userEmail ||
        taskAssignedBy === userNick
      );

      // MATRIX RULE: Only Admin or Creator can delete the task!
      if (!isAdmin && !isCreator) {
        return NextResponse.json({ error: "Permission Denied: Only Org Admin or Creator can delete this task" }, { status: 403 });
      }

      await prisma.task.delete({
        where: { id, organizationId: user.organizationId }
      });

      return NextResponse.json({ success: true });
    } catch (err) {
      console.error("Task delete error:", err);
      return NextResponse.json({ error: "Failed to delete Task" }, { status: 500 });
    }
  })(request, context);
}
