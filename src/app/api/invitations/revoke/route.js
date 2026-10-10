import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { inviteId } = await request.json();

    if (!inviteId) {
      return NextResponse.json({ error: "Invite ID is required" }, { status: 400 });
    }

    // Verify the invite belongs to this org and is pending
    const invite = await prisma.invitation.findUnique({
      where: { id: inviteId }
    });

    if (!invite || invite.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }

    // Delete the pending invitation
    await prisma.invitation.delete({
      where: { id: inviteId }
    });

    return NextResponse.json({ message: "Invitation revoked successfully!" }, { status: 200 });
  } catch (error) {
    console.error("Error revoking invitation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
