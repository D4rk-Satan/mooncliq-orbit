import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { withPermission } from '../../../../lib/rbac';

export const DELETE = withPermission('Task', 'delete', async (request, user, context) => {
  try {
    const { id } = await context.params;

    // Tasks generally don't have downstream restrictive dependencies in this schema.
    
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
});
