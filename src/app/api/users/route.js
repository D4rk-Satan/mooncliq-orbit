import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { withPermission } from "../../../lib/rbac";

export const GET = withPermission('Settings', 'manageUsers', async (request, user) => {
  try {
    const users = await prisma.user.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      include: { profile: true },
      orderBy: { email: "asc" }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

export const PATCH = withPermission('Settings', 'manageUsers', async (request, user) => {
  try {
    const { userId, isActive } = await request.json();

    if (userId === user.id) {
      return NextResponse.json({ error: "You cannot revoke your own access!" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId, organizationId: user.organizationId },
      data: { isActive: isActive }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});
