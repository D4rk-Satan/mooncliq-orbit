import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // 1. Find the pending invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token }
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation token." }, { status: 404 });
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json({ error: "This invitation has already been accepted or revoked." }, { status: 400 });
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' }
      });
      return NextResponse.json({ error: "This invitation has expired." }, { status: 400 });
    }

    // 2. Mock User Creation / Acceptance
    // In a real app, this happens AFTER they sign up in Cognito. 
    // Since we are mocking auth, we just create a User record now.
    const mockCognitoId = `user-${Date.now()}`;
    
    // Check if user somehow already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email }
    });

    if (existingUser) {
      return NextResponse.json({ error: "User already exists with this email." }, { status: 400 });
    }

    const newUser = await prisma.user.create({
      data: {
        id: mockCognitoId,
        email: invitation.email,
        organizationId: invitation.organizationId,
        profileId: invitation.profileId,
        isActive: true,
      }
    });

    // 3. Mark the invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' }
    });

    // 4. Fetch Organization Name for UI
    const org = await prisma.organization.findUnique({
      where: { id: invitation.organizationId },
      select: { name: true }
    });

    return NextResponse.json({ 
      message: "Invitation accepted successfully!",
      user: { id: newUser.id, email: newUser.email },
      orgName: org?.name || 'Workspace'
    }, { status: 200 });

  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
