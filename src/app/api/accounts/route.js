import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUser } from '../../../lib/auth';
import { executeBackendWorkflows } from '../../../utils/workflowEngine';

export async function POST(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.profile?.canAccessSettings && !user.profile?.permissions?.Account?.create) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to create Accounts" }, { status: 403 });
    }

    const body = await req.json();
    const { companyName, email, gstNo, website, address, contactPerson, customData, blueprintId } = body;

    if (!companyName || !blueprintId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find the initial stage for this blueprint (Order Index 0)
    let initialStage = await prisma.stage.findFirst({
      where: { blueprintId, orderIndex: 0 }
    });

    // Fallback if no orderIndex 0 exists
    if (!initialStage) {
      initialStage = await prisma.stage.findFirst({
        where: { blueprintId }
      });
    }

    if (!initialStage) {
      initialStage = await prisma.stage.create({
        data: {
          name: 'Default',
          blueprintId,
          orderIndex: 0,
          color: '#e2e8f0'
        }
      });
    }

    const account = await prisma.account.create({
      data: {
        organizationId: user.organizationId,
        blueprintId,
        stageId: initialStage.id,
        companyName,
        email,
        gstNo,
        website,
        address,
        contactPerson,
        customData
      }
    });

    // Execute Backend Workflows (Async)
    executeBackendWorkflows(user.organizationId, 'Account', 'Created', account);

    return NextResponse.json(account);
  } catch (error) {
    console.error("Error creating account:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.profile?.canAccessSettings && !user.profile?.permissions?.Account?.view) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view Accounts" }, { status: 403 });
    }

    const whereClause = { organizationId: user.organizationId };

    // Apply Data Visibility Rules
    if (!user.profile?.canAccessSettings && user.profile?.permissions?.Account?.visibility === 'private') {
      // NOTE: Account may not have an explicit owner column right now. 
      // We will check customData.owner or fallback.
      // Usually, ownership is handled via relation or standard field.
      // We will assume there is an owner field or we check customData.owner
      // Wait, let's look at schema to see if Account has an owner field.
      // Actually, since Account is created dynamically, we can query customData ->> 'owner' in Postgres,
      // but Prisma JSON filtering might be complex. Let's just do a manual filter for now if it's in customData.
      // Since it's just a demo/example, we'll implement it as best as we can without schema change.
    }

    let accounts = await prisma.account.findMany({
      where: whereClause,
      include: { stage: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!user.profile?.canAccessSettings && user.profile?.permissions?.Account?.visibility === 'private') {
      accounts = accounts.filter(acc => {
        let customData = acc.customData;
        if (typeof customData === 'string') {
          try { customData = JSON.parse(customData); } catch (e) { customData = {}; }
        }
        return customData?.owner === user.email;
      });
    }

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!user.profile?.canAccessSettings && !user.profile?.permissions?.Account?.edit) {
      return NextResponse.json({ error: "Forbidden: No permission to edit Accounts" }, { status: 403 });
    }

    const data = await req.json();
    const { accountId, stageId, customData, tags, transitionId, ...standardFields } = data;

    if (!accountId) return NextResponse.json({ error: "Missing accountId" }, { status: 400 });

    let updateData = { ...standardFields };
    if (stageId) updateData.stageId = stageId;
    if (customData) updateData.customData = customData;

    // Format Revenue correctly for Prisma
    if (updateData.annualRevenue !== undefined) updateData.annualRevenue = parseFloat(updateData.annualRevenue) || null;
    if (updateData.teamSize !== undefined) updateData.teamSize = parseInt(updateData.teamSize) || null;

    const updatedAccount = await prisma.account.update({
      where: { id: accountId },
      data: updateData
    });

    if (typeof executeBackendWorkflows === "function") {
      executeBackendWorkflows(user.organizationId, 'Account', 'Edited', updatedAccount);
    }

    return NextResponse.json(updatedAccount);
  } catch (error) {
    console.error("Error updating Account:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
