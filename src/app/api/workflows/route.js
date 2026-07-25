import prisma from '../../../lib/prisma';
import { getAuthUser } from '../../../lib/auth';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workflows = await prisma.workflowRule.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(workflows);
  } catch (error) {
    console.error("GET /api/workflows error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const workflow = await prisma.workflowRule.create({
      data: {
        organizationId: user.organizationId,
        moduleType: body.moduleType,
        name: body.name,
        recordEvent: body.recordEvent,
        triggerCategory: body.triggerCategory,
        triggerEvent: body.triggerEvent,
        targetFields: body.targetFields || [],
        code: body.code,
        isActive: body.isActive ?? true
      }
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("POST /api/workflows error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const body = await req.json();

    const workflow = await prisma.workflowRule.updateMany({
      where: { id, organizationId: user.organizationId },
      data: {
        moduleType: body.moduleType,
        name: body.name,
        recordEvent: body.recordEvent,
        triggerCategory: body.triggerCategory,
        triggerEvent: body.triggerEvent,
        targetFields: body.targetFields || [],
        code: body.code,
        isActive: body.isActive ?? true
      }
    });

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("PUT /api/workflows error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    await prisma.workflowRule.deleteMany({
      where: { id, organizationId: user.organizationId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/workflows error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
