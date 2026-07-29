import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const moduleType = searchParams.get('moduleType');

    const query = { where: { organizationId: user.organizationId } };
    if (moduleType) {
      query.where.moduleType = moduleType;
    }

    const scripts = await prisma.clientScript.findMany({
      ...query,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(scripts);
  } catch (error) {
    console.error('Error fetching client scripts:', error);
    return NextResponse.json({ error: 'Failed to fetch scripts' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, moduleType, triggerEvent, targetField, code, isActive } = body;

    const script = await prisma.clientScript.create({
      data: {
        organizationId: user.organizationId,
        name,
        moduleType,
        triggerEvent,
        targetField,
        code,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json(script);
  } catch (error) {
    console.error('Error creating client script:', error);
    return NextResponse.json({ error: 'Failed to create script' }, { status: 500 });
  }
}
