import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getAuthUser } from '../../../../lib/auth';
import { executeBackendWorkflows } from '../../../../utils/workflowEngine';

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.profile?.canAccessSettings && !user.profile?.permissions?.Lead?.create) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to create Leads" }, { status: 403 });
    }

    const { rows } = await request.json();
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No data to import" }, { status: 400 });
    }

    // Get the blueprint for Leads
    const blueprint = await prisma.blueprint.findFirst({
      where: { organizationId: user.organizationId, moduleType: 'Lead' }
    });

    if (!blueprint) {
      return NextResponse.json({ error: "Lead Blueprint not found" }, { status: 400 });
    }

    // Find the initial stage for this blueprint (Order Index 0)
    let initialStage = await prisma.stage.findFirst({
      where: { blueprintId: blueprint.id, orderIndex: 0 }
    });

    if (!initialStage) {
      initialStage = await prisma.stage.findFirst({
        where: { blueprintId: blueprint.id }
      });
    }

    if (!initialStage) {
      initialStage = await prisma.stage.create({
        data: {
          name: 'New',
          blueprintId: blueprint.id,
          orderIndex: 0,
          color: '#e2e8f0'
        }
      });
    }

    let importedCount = 0;
    const errors = [];
    const standardFields = ['firstName', 'lastName', 'email', 'phone', 'owner'];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Extract standard fields
        const firstName = row.firstName || row['First Name'] || `Lead ${i + 1}`;
        const lastName = row.lastName || row['Last Name'] || '';
        const email = row.email || row.Email || '';
        const phone = row.phone || row.Phone || '';
        const owner = row.owner || row.Owner || user.email;

        // Group everything else into customData
        const customData = {};
        for (const [key, value] of Object.entries(row)) {
          if (!standardFields.includes(key) && 
              key !== 'First Name' && key !== 'Last Name' && 
              key !== 'Email' && key !== 'Phone' && key !== 'Owner' &&
              key !== 'id' && key !== 'createdAt' && key !== 'stage') {
            
            // Remove 'custom_' prefix if it came from our export
            const finalKey = key.startsWith('custom_') ? key.replace('custom_', '') : key;
            customData[finalKey] = value;
          }
        }

        const newLead = await prisma.lead.create({
          data: {
            organizationId: user.organizationId,
            blueprintId: blueprint.id,
            stageId: initialStage.id,
            firstName,
            lastName,
            email,
            phone,
            owner,
            customData
          },
          include: {
            stage: true,
            tags: true
          }
        });

        // Execute Workflows
        executeBackendWorkflows(user.organizationId, 'Lead', 'Created', newLead);

        importedCount++;
      } catch (rowError) {
        console.error(`Error importing row ${i}:`, rowError);
        errors.push(`Row ${i + 1}: ${rowError.message}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      importedCount, 
      errors: errors.length > 0 ? errors : undefined 
    });

  } catch (error) {
    console.error("Error in bulk import:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
