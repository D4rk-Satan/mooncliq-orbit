import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUser } from '../../../lib/auth';
import { getDefaultBlueprintData } from '@/utils/blueprintDefaults';


export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const moduleType = searchParams.get('moduleType') || 'Lead';

  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (moduleType === 'ALL') {
      const standardModules = ['Lead', 'Deal', 'Account', 'Product', 'Task'];
      let blueprints = await prisma.blueprint.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { updatedAt: 'desc' }
      });

      const existingTypes = blueprints.map(b => b.moduleType);
      const missingModules = standardModules.filter(m => !existingTypes.includes(m));

      if (missingModules.length > 0) {
        for (const mod of missingModules) {
          const newBp = await prisma.blueprint.create({
            data: {
              organizationId: user.organizationId,
              moduleType: mod,
              name: `Default ${mod} Pipeline`,
              version: 1,
              ...getDefaultBlueprintData(mod)
            }
          });
          blueprints.push(newBp);
        }
      }
      return NextResponse.json(blueprints);
    }

    let blueprint = await prisma.blueprint.findFirst({
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
      // Auto-initialize default blueprint if it doesn't exist
      blueprint = await prisma.blueprint.create({
        data: {
          organizationId: user.organizationId,
          moduleType,
          name: `Default ${moduleType} Pipeline`,
          version: 1,
          ...getDefaultBlueprintData(moduleType)
        },
        include: {
          fields: true,
          stages: true,
          transitions: {
            include: { fromStages: true }
          }
        }
      });
    }

    return NextResponse.json(blueprint);
  } catch (error) {
    console.error("Failed to fetch blueprint:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await request.json();
    const { id, isActive } = data;

    if (!id) return NextResponse.json({ error: "Blueprint ID is required" }, { status: 400 });

    const updatedBlueprint = await prisma.blueprint.update({
      where: { id, organizationId: user.organizationId },
      data: { isActive }
    });

    return NextResponse.json(updatedBlueprint);
  } catch (error) {
    console.error("Failed to update blueprint:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
