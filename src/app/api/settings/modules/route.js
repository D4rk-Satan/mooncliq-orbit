import { NextResponse } from 'next/server';
import { getAuthUser } from '../../../../lib/auth';
import prisma from '../../../../lib/prisma';

export async function POST(req) {
  try {
    const user = await getAuthUser(req);
    if (!user || !user.profile?.canAccessSettings) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { activeModules } = await req.json();

    if (!Array.isArray(activeModules)) {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    const updatedOrg = await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        activeModules: activeModules
      }
    });

    return NextResponse.json({ success: true, activeModules: updatedOrg.activeModules });
  } catch (error) {
    console.error("Error updating modules:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
