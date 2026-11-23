import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const nickname = request.nextUrl.searchParams.get("nickname");
    const cleanNick = (nickname || '').trim().toLowerCase();

    if (!cleanNick) {
      return NextResponse.json({ available: false, error: "Nickname is required" });
    }

    if (cleanNick.length < 2) {
      return NextResponse.json({ available: false, error: "Nickname must be at least 2 characters" });
    }

    // Check in User model for this organization
    const existingUser = await prisma.user.findFirst({
      where: {
        organizationId: user.organizationId,
        nickname: { equals: cleanNick, mode: 'insensitive' }
      }
    });

    // Also check in pending invitations
    const existingInvite = await prisma.invitation.findFirst({
      where: {
        organizationId: user.organizationId,
        status: 'PENDING',
        nickname: { equals: cleanNick, mode: 'insensitive' }
      }
    });

    const available = !existingUser && !existingInvite;

    return NextResponse.json({
      available,
      message: available ? "Nickname is available" : "Nickname is already taken in your organization"
    });
  } catch (error) {
    console.error("Error checking nickname:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
