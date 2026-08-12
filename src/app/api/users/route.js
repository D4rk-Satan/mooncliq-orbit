import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { getAuthUser } from "../../../lib/auth";

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const users = await prisma.user.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { id: true, email: true },
      orderBy: { email: "asc" }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
