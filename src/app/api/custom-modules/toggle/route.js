import { NextResponse } from 'next/server';
import { getAuthUser } from '../../../../lib/auth';
import prisma from '../../../../lib/prisma';

export async function POST(req) {
  try {
    const user = await getAuthUser(req);
    if (!user || !user.profile?.canAccessSettings) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { customModuleId, isActive } = await req.json();

    if (!customModuleId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const updatedModule = await prisma.customModule.update({
      where: { 
        id: customModuleId,
        organizationId: user.organizationId 
      },
      data: {
        isActive: isActive
      }
    });

    return NextResponse.json({ success: true, customModule: updatedModule });
  } catch (error) {
    console.error("Error toggling custom module:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
