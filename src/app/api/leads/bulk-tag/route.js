import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getAuthUser } from '../../../../lib/auth';

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { leadIds, tagId } = data;

    if (!Array.isArray(leadIds) || leadIds.length === 0 || !tagId) {
      return NextResponse.json({ error: "leadIds and tagId are required" }, { status: 400 });
    }

    // Verify ownership of the tag
    const tag = await prisma.tag.findFirst({
      where: { id: tagId, organizationId: user.organizationId }
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Verify ownership of leads
    const leads = await prisma.lead.findMany({
      where: { 
        id: { in: leadIds },
        organizationId: user.organizationId
      }
    });

    const validLeadIds = leads.map(l => l.id);

    // Update leads with the new tag using Prisma relation
    await Promise.all(
      validLeadIds.map(leadId => 
        prisma.lead.update({
          where: { id: leadId },
          data: {
            tags: {
              connect: { id: tagId }
            }
          }
        })
      )
    );

    // Generate Audit Logs for bulk action
    await Promise.all(
      validLeadIds.map(leadId => 
        prisma.auditLog.create({
          data: {
            organizationId: user.organizationId,
            leadId,
            actionType: "TagsUpdated",
            details: { addedTag: tag.name }
          }
        })
      )
    );

    return NextResponse.json({ success: true, count: validLeadIds.length });
  } catch (error) {
    console.error("Error bulk tagging leads:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
