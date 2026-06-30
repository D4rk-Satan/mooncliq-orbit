import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUser } from '../../../lib/auth';

export async function GET(request) {
  console.log("PRISMA KEYS:", Object.keys(prisma));
  console.log("PRISMA USER:", typeof prisma.user);
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leads = await prisma.lead.findMany({
      where: {
        organizationId: user.organizationId
      },
      include: {
        stage: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(leads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { firstName, lastName, email, phone, owner, stageId, customData, blueprintId } = data;

    const newLead = await prisma.lead.create({
      data: {
        organizationId: user.organizationId,
        blueprintId,
        stageId,
        firstName,
        lastName,
        email,
        phone,
        owner,
        customData: customData || {}
      },
      include: {
        stage: true
      }
    });

    // Generate Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        leadId: newLead.id,
        actionType: "LeadCreated",
        details: { stageId }
      }
    });

    return NextResponse.json(newLead);
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { leadId, stageId, customData, tags } = data;

    if (!leadId) {
      return NextResponse.json({ error: "Missing leadId" }, { status: 400 });
    }

    // Verify lead belongs to user's org
    const existingLead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: user.organizationId }
    });

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const updateData = {};
    if (stageId) updateData.stageId = stageId;
    if (customData) updateData.customData = customData;
    if (tags !== undefined) updateData.tags = tags;

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
      include: { stage: true }
    });

    // Generate Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        leadId: updatedLead.id,
        actionType: "StageChanged",
        details: { newStageId: stageId }
      }
    });

    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
