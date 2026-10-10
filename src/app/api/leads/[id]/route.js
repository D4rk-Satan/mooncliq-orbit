import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { withPermission } from '../../../../lib/rbac';

export const DELETE = withPermission('Lead', 'delete', async (request, user, context) => {
  try {
    const { id } = await context.params;

    // 1. Check if Lead is linked to Deals via convertedFromLead
    const linkedDeals = await prisma.deal.findMany({
      where: { 
        organizationId: user.organizationId,
        convertedFromLead: id 
      }
    });

    if (linkedDeals.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete this Lead. It is linked to ${linkedDeals.length} Deal(s). Please remove the linked deals first.` },
        { status: 400 }
      );
    }

    // 2. Delete the Lead (this will cascade delete AuditLogs and Tags relation if set up)
    await prisma.lead.delete({
      where: { 
        id: id,
        organizationId: user.organizationId // ensure they only delete their own
      }
    });

    return NextResponse.json({ success: true, message: "Lead deleted successfully" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
