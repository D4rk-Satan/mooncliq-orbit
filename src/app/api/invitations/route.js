import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { sendInvitationEmail } from '@/lib/sesClient';

// In a real app, this would get the authenticated user from Clerk/Cognito
// Mocking the admin user for now:
const MOCK_ADMIN_USER_ID = "mock-user-1";
const MOCK_ORG_ID = "org-1";

export async function POST(request) {
  try {
    const { email, profileId } = await request.json();

    if (!email || !profileId) {
      return NextResponse.json({ error: "Email and Profile ID are required" }, { status: 400 });
    }

    // 1. Verify Admin Permissions (Mocked for now)
    const admin = await prisma.user.findFirst({
      include: { profile: true, organization: true }
    });

    if (!admin || !admin.profile?.canManageUsers) {
      return NextResponse.json({ error: "Unauthorized. You do not have permission to invite users." }, { status: 403 });
    }

    // 2. Check if the user is already in the organization
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser && existingUser.organizationId === admin.organizationId) {
      return NextResponse.json({ error: "User is already a member of this organization." }, { status: 400 });
    }

    // 3. Check if there's already a pending invite
    const existingInvite = await prisma.invitation.findUnique({
      where: { email_organizationId: { email, organizationId: admin.organizationId } }
    });

    if (existingInvite && existingInvite.status === 'PENDING') {
      return NextResponse.json({ error: "An invitation has already been sent to this email." }, { status: 400 });
    }

    // 4. Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    
    // 5. Save Invitation to DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    let invitation;
    if (existingInvite) {
      // Update expired or declined invite
      invitation = await prisma.invitation.update({
        where: { id: existingInvite.id },
        data: { token, status: 'PENDING', profileId, expiresAt }
      });
    } else {
      // Create new invite
      invitation = await prisma.invitation.create({
        data: {
          email,
          token,
          organizationId: admin.organizationId,
          profileId,
          expiresAt
        }
      });
    }

    // 6. Send the Email via AWS SES
    const targetProfile = await prisma.profile.findUnique({ where: { id: profileId } });
    // In production, process.env.NEXT_PUBLIC_APP_URL should be set (e.g. https://mooncliq.com)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/invite/${token}`;

    const emailSent = await sendInvitationEmail(
      email,
      inviteLink,
      admin.organization.name,
      targetProfile?.name || 'User'
    );

    if (!emailSent) {
      // We could optionally delete the invite here, or leave it pending
      return NextResponse.json({ message: "Invitation created, but failed to send email via AWS SES. Check server logs." }, { status: 201 });
    }

    return NextResponse.json({ message: "Invitation sent successfully!" }, { status: 201 });

  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    // 1. Verify Admin Permissions (Mocked for now)
    const admin = await prisma.user.findUnique({
      where: { id: MOCK_ADMIN_USER_ID },
      include: { profile: true }
    });

    if (!admin || !admin.profile?.canManageUsers) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 2. Fetch pending invites
    const invitations = await prisma.invitation.findMany({
      where: { organizationId: admin.organizationId, status: 'PENDING' },
      include: { profile: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
