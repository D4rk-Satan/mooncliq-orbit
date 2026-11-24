import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: "Token is required." }, { status: 400 });
    }

    // 1. Invitation check karein
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: { select: { id: true, name: true, logoUrl: true } }
      }
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation link." }, { status: 404 });
    }

    if (invitation.status === 'ACCEPTED') {
      return NextResponse.json({ 
        error: "This invitation has already been accepted. Please sign in.",
        alreadyAccepted: true 
      }, { status: 400 });
    }

    if (invitation.status === 'REVOKED') {
      return NextResponse.json({ error: "This invitation has been revoked by the administrator." }, { status: 400 });
    }

    // Expiry check
    if (new Date() > new Date(invitation.expiresAt)) {
      return NextResponse.json({ error: "This invitation link has expired." }, { status: 400 });
    }

    // 2. Safe invite details return karein frontend ko
    return NextResponse.json({
      valid: true,
      email: invitation.email,
      name: invitation.name,
      nickname: invitation.nickname,
      role: invitation.role,
      orgName: invitation.organization?.name || 'Workspace',
      orgLogo: invitation.organization?.logoUrl || null
    });

  } catch (error) {
    console.error("Error verifying invitation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
