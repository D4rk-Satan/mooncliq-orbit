import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { sendInvitationEmail } from '@/lib/sesClient';
import { withPermission } from '@/lib/rbac';

export const POST = withPermission('Settings', 'manageUsers', async (request, user) => {
  try {
    const { email, profileId } = await request.json();

    if (!email || !profileId) {
      return NextResponse.json({ error: "Email and Profile ID are required" }, { status: 400 });
    }

    // 1. Check if the user is already in the organization
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser && existingUser.organizationId === user.organizationId) {
      return NextResponse.json({ error: "User is already a member of this organization." }, { status: 400 });
    }

    // 2. Check if there's already a pending invite
    const existingInvite = await prisma.invitation.findUnique({
      where: { email_organizationId: { email, organizationId: user.organizationId } }
    });

    if (existingInvite && existingInvite.status === 'PENDING') {
      return NextResponse.json({ error: "An invitation has already been sent to this email." }, { status: 400 });
    }

    // 3. Generate secure token
    const token = crypto.randomBytes(32).toString('hex');

    // 4. Save Invitation to DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    let invitation;
    if (existingInvite) {
      invitation = await prisma.invitation.update({
        where: { id: existingInvite.id },
        data: { token, status: 'PENDING', profileId, expiresAt }
      });
    } else {
      invitation = await prisma.invitation.create({
        data: {
          email,
          token,
          organizationId: user.organizationId,
          profileId,
          expiresAt
        }
      });
    }

    // 5. Send the Email via AWS SES
    const targetProfile = await prisma.profile.findUnique({ where: { id: profileId } });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/invite/${token}`;

    const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });

    const emailSent = await sendInvitationEmail(
      email,
      inviteLink,
      org?.name || 'Your Organization',
      targetProfile?.name || 'User'
    );

    if (!emailSent) {
      return NextResponse.json({ message: "Invitation created, but failed to send email via AWS SES. Check server logs." }, { status: 201 });
    }

    return NextResponse.json({ message: "Invitation sent successfully!" }, { status: 201 });

  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

export const GET = withPermission('Settings', 'manageUsers', async (request, user) => {
  try {
    const invitations = await prisma.invitation.findMany({
      where: { organizationId: user.organizationId, status: 'PENDING' },
      include: { profile: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});
