import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUser } from '../../../lib/auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const moduleType = searchParams.get('moduleType') || 'Lead';

  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const blueprint = await prisma.blueprint.findFirst({
      where: { 
        moduleType,
        organizationId: user.organizationId
      },
      include: {
        fields: {
          orderBy: { orderIndex: 'asc' }
        },
        stages: {
          orderBy: { orderIndex: 'asc' }
        },
        transitions: {
          include: { fromStages: true }
        }
      }
    });

    if (!blueprint) {
      return NextResponse.json({ error: 'Blueprint not found' }, { status: 404 });
    }

    return NextResponse.json(blueprint);
  } catch (error) {
    console.error("Failed to fetch blueprint:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
