import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function PUT(req, { params }) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const script = await prisma.clientScript.updateMany({
      where: { id, organizationId: user.organizationId },
      data: {
        name: body.name,
        moduleType: body.moduleType,
        triggerEvent: body.triggerEvent,
        targetField: body.targetField,
        code: body.code,
        isActive: body.isActive ?? true
      }
    });

    return NextResponse.json(script);
  } catch (error) {
    console.error('Error updating client script:', error);
    return NextResponse.json({ error: 'Failed to update script' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    await prisma.clientScript.deleteMany({
      where: { id, organizationId: user.organizationId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client script:', error);
    return NextResponse.json({ error: 'Failed to delete script' }, { status: 500 });
  }
}
