import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { withPermission } from "../../../lib/rbac";
import { getAuthUser } from "../../../lib/auth";

// GET: Authenticated users can fetch active members of their organization (for Task assignment & mentions)
export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      include: {
        profile: true,
        reportsTo: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { email: "asc" }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const PATCH = withPermission('Settings', 'manageUsers', async (request, user) => {
  try {
    const { userId, isActive, role, reportsToId, profileId, name } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (isActive === false && userId === user.id) {
      return NextResponse.json({ error: "You cannot revoke your own access!" }, { status: 400 });
    }

    // Prevent cyclic hierarchy (user cannot report to themselves)
    if (reportsToId && reportsToId === userId) {
      return NextResponse.json({ error: "A user cannot report to themselves!" }, { status: 400 });
    }

    const updateData = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (role !== undefined) updateData.role = role ? role.trim() : null;
    if (reportsToId !== undefined) updateData.reportsToId = reportsToId || null;
    if (profileId !== undefined) updateData.profileId = profileId || null;
    if (name !== undefined) updateData.name = name ? name.trim() : null;

    const updatedUser = await prisma.user.update({
      where: { id: userId, organizationId: user.organizationId },
      data: updateData,
      include: {
        profile: true,
        reportsTo: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});
