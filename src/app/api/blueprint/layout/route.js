import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getAuthUser } from '../../../../lib/auth';

export async function PUT(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { blueprintId, layoutConfig, fields } = await request.json();

    // Verify blueprint belongs to user's org
    const bp = await prisma.blueprint.findFirst({ where: { id: blueprintId, organizationId: user.organizationId }});
    if (!bp) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Update layoutConfig
    if (layoutConfig) {
      await prisma.blueprint.update({
        where: { id: blueprintId },
        data: { layoutConfig }
      });
    }

    // Update fields (if provided)
    if (fields && fields.length > 0) {
      await Promise.all(fields.map(f => 
        prisma.field.update({
          where: { id: f.id },
          data: { sectionName: f.sectionName, sectionOrder: f.sectionOrder, orderIndex: f.orderIndex }
        })
      ));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update layout:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
