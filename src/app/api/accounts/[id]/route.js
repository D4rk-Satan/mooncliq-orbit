import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { withPermission } from '../../../../lib/rbac';

export const DELETE = withPermission('Account', 'delete', async (request, user, context) => {
  try {
    const { id } = await context.params;

    // Check if tasks are linked to this Account
    const linkedTasks = await prisma.task.findMany({
      where: {
        organizationId: user.organizationId,
        relatedModule: 'Accounts',
        relatedRecordId: id
      }
    });

    if (linkedTasks.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete this Account. It is linked to ${linkedTasks.length} Task(s). Please remove the linked tasks first.` },
        { status: 400 }
      );
    }

    await prisma.account.delete({
      where: { 
        id,
        organizationId: user.organizationId 
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Account delete error:", err);
    return NextResponse.json({ error: "Failed to delete Account" }, { status: 500 });
  }
});
