import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { executeBackendWorkflows } from '@/utils/workflowEngine';

/**
 * Universal Import API for any Module (Lead, Deal, Account, Task, Product, Custom Modules)
 */
export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { moduleName = 'Lead', moduleId, rows } = await request.json();
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No data to import" }, { status: 400 });
    }

    const normalizedModule = (moduleName || 'Lead').trim();

    // Check RBAC Create Permission
    if (!user.profile?.canAccessSettings && !user.profile?.permissions?.[normalizedModule]?.create) {
      return NextResponse.json({ error: `Forbidden: You do not have permission to create ${normalizedModule}s` }, { status: 403 });
    }

    // Get Blueprint for this module
    const blueprint = await prisma.blueprint.findFirst({
      where: { organizationId: user.organizationId, moduleType: normalizedModule }
    });

    if (!blueprint) {
      return NextResponse.json({ error: `${normalizedModule} Blueprint not found` }, { status: 400 });
    }

    // Find default initial stage
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
    const lower = normalizedModule.toLowerCase();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const ownerFallback = user.profile?.nickname || user.name || user.email;

        if (lower === 'lead') {
          let firstName = row.firstName || "";
          let lastName = row.lastName || "";
          if (!firstName && row.fullName) {
            const parts = row.fullName.trim().split(" ");
            firstName = parts[0] || "";
            lastName = parts.slice(1).join(" ") || "";
          }

          const standardLeadFields = ['firstName', 'lastName', 'fullName', 'email', 'phone', 'owner', 'companyName'];
          const customData = {};
          Object.keys(row).forEach(k => {
            if (!standardLeadFields.includes(k)) customData[k] = row[k];
          });

          const created = await prisma.lead.create({
            data: {
              organizationId: user.organizationId,
              blueprintId: blueprint.id,
              stageId: initialStage.id,
              firstName: firstName || "Unknown",
              lastName: lastName || "",
              fullName: `${firstName} ${lastName}`.trim(),
              companyName: row.companyName || "",
              email: row.email || "",
              phone: row.phone ? String(row.phone) : "",
              owner: row.owner || ownerFallback,
              customData
            }
          });
          importedCount++;
          executeBackendWorkflows(user.organizationId, 'Lead', 'Created', created);

        } else if (lower === 'deal') {
          const standardDealFields = ['dealName', 'companyName', 'dealValue', 'email', 'owner', 'primaryContact', 'priority', 'notes'];
          const customData = {};
          Object.keys(row).forEach(k => {
            if (!standardDealFields.includes(k)) customData[k] = row[k];
          });

          const created = await prisma.deal.create({
            data: {
              organizationId: user.organizationId,
              blueprintId: blueprint.id,
              stageId: initialStage.id,
              dealName: row.dealName || row.name || 'Untitled Deal',
              companyName: row.companyName || '',
              dealValue: row.dealValue ? parseFloat(row.dealValue) || 0 : 0,
              email: row.email || '',
              primaryContact: row.primaryContact || '',
              priority: row.priority || 'Medium',
              notes: row.notes || '',
              owner: row.owner || ownerFallback,
              customData
            }
          });
          importedCount++;
          executeBackendWorkflows(user.organizationId, 'Deal', 'Created', created);

        } else if (lower === 'account') {
          const standardAccountFields = ['accountName', 'phone', 'email', 'website', 'owner', 'industry'];
          const customData = {};
          Object.keys(row).forEach(k => {
            if (!standardAccountFields.includes(k)) customData[k] = row[k];
          });

          const created = await prisma.account.create({
            data: {
              organizationId: user.organizationId,
              blueprintId: blueprint.id,
              stageId: initialStage.id,
              accountName: row.accountName || row.name || 'Untitled Account',
              phone: row.phone ? String(row.phone) : '',
              email: row.email || '',
              website: row.website || '',
              industry: row.industry || '',
              owner: row.owner || ownerFallback,
              customData
            }
          });
          importedCount++;
          executeBackendWorkflows(user.organizationId, 'Account', 'Created', created);

        } else if (lower === 'task') {
          const standardTaskFields = ['taskName', 'dueDateTime', 'priority', 'owner', 'notes'];
          const customData = {};
          Object.keys(row).forEach(k => {
            if (!standardTaskFields.includes(k)) customData[k] = row[k];
          });

          const created = await prisma.task.create({
            data: {
              organizationId: user.organizationId,
              blueprintId: blueprint.id,
              stageId: initialStage.id,
              taskName: row.taskName || row.name || 'Untitled Task',
              dueDateTime: row.dueDateTime ? new Date(row.dueDateTime) : null,
              priority: row.priority || 'Medium',
              notes: row.notes || '',
              owner: row.owner || ownerFallback,
              customData
            }
          });
          importedCount++;
          executeBackendWorkflows(user.organizationId, 'Task', 'Created', created);

        } else if (lower === 'product') {
          const standardProductFields = ['productName', 'unitPrice', 'productCode', 'status', 'description'];
          const customData = {};
          Object.keys(row).forEach(k => {
            if (!standardProductFields.includes(k)) customData[k] = row[k];
          });

          const created = await prisma.product.create({
            data: {
              organizationId: user.organizationId,
              blueprintId: blueprint.id,
              stageId: initialStage.id,
              productName: row.productName || row.name || 'Untitled Product',
              unitPrice: row.unitPrice ? parseFloat(row.unitPrice) || 0 : 0,
              productCode: row.productCode || '',
              status: row.status || 'Active',
              description: row.description || '',
              owner: row.owner || ownerFallback,
              customData
            }
          });
          importedCount++;

        } else {
          // Custom Module Record
          let customModuleId = moduleId;
          if (!customModuleId) {
            const cm = await prisma.customModule.findFirst({
              where: { organizationId: user.organizationId, name: normalizedModule }
            });
            if (cm) customModuleId = cm.id;
          }

          if (customModuleId) {
            await prisma.customRecord.create({
              data: {
                organizationId: user.organizationId,
                customModuleId,
                blueprintId: blueprint.id,
                stageId: initialStage.id,
                customData: row
              }
            });
            importedCount++;
          }
        }

      } catch (err) {
        console.error(`Row ${i + 1} import error:`, err);
        errors.push({ row: i + 1, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      totalRows: rows.length,
      errors
    });

  } catch (error) {
    console.error("Universal Import Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
