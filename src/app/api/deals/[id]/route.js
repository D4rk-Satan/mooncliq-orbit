import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { withPermission } from '../../../../lib/rbac';

export const DELETE = withPermission('Deal', 'delete', async (request, user, context) => {
  try {
    const { id } = await context.params;

    // 1. Check if Deal has dependencies? Deals might not have strict downstream dependencies to block on, 
    // but Tasks could be linked to Deals. Let's check if any Tasks are linked to this Deal.
    const linkedTasks = await prisma.task.findMany({
      where: {
        organizationId: user.organizationId,
        relatedDealId: id
      }
    });

    if (linkedTasks.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete this Deal. It is linked to ${linkedTasks.length} Task(s). Please remove the linked tasks first.` },
        { status: 400 }
      );
    }

    // 2. Delete the Deal
    await prisma.deal.delete({
      where: { 
        id,
        organizationId: user.organizationId 
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Deal delete error:", err);
    return NextResponse.json({ error: "Failed to delete Deal" }, { status: 500 });
  }
});
