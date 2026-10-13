import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Single unified fetch for active custom modules
    const customModules = await prisma.customModule.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const bootstrapData = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: user.organizationId,
        organization: {
          id: user.organization?.id,
          name: user.organization?.name,
          activeModules: user.organization?.activeModules || []
        },
        profile: user.profile || null
      },
      customModules: customModules || []
    };

    return NextResponse.json(bootstrapData);
  } catch (error) {
    console.error("Error in /api/bootstrap:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
