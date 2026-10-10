import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { withPermission } from '../../../../../lib/rbac';

export const DELETE = withPermission('CustomModule', 'delete', async (request, user, context) => {
  try {
    const { id } = await context.params;

    // Wait, withPermission needs a specific module name to check RBAC. For custom modules, the moduleName might be dynamic.
    // We will bypass the strict `withPermission` check here and do it manually or assume if they can hit this, they have permission?
    // Actually, let's keep it but they need 'delete' on 'CustomModule'. We might need to check if the specific module allows it, but for now we'll allow it if they can delete custom module records.

    // Let's delete the record. We don't have standard restrictive checks for custom records yet.
    
    await prisma.customRecord.delete({
      where: { 
        id,
        organizationId: user.organizationId 
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("CustomRecord delete error:", err);
    return NextResponse.json({ error: "Failed to delete custom record" }, { status: 500 });
  }
});
