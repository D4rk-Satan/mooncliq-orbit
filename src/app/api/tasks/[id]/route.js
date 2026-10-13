import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { withPermission } from '../../../../lib/rbac';

export async function DELETE(request, context) {
  return withPermission('Task', 'delete', async (req, user) => {
    try {
      const { id } = await context.params;

      await prisma.task.delete({
        where: { 
          id,
          organizationId: user.organizationId 
        }
      });

      return NextResponse.json({ success: true });
    } catch (err) {
      console.error("Task delete error:", err);
      return NextResponse.json({ error: "Failed to delete Task" }, { status: 500 });
    }
  })(request, context);
}
