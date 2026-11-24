import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand
} from '@aws-sdk/client-cognito-identity-provider';

function getCognitoClient() {
  const accessKeyId =
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.SES_AWS_ACCESS_KEY_ID ||
    process.env.S3_UPLOAD_AWS_ACCESS_KEY_ID;

  const secretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY ||
    process.env.SES_AWS_SECRET_ACCESS_KEY ||
    process.env.S3_UPLOAD_AWS_SECRET_ACCESS_KEY;

  const region = process.env.NEXT_PUBLIC_AWS_COGNITO_REGION || process.env.AWS_REGION || "ap-south-1";

  const config = { region };
  if (accessKeyId && secretAccessKey) {
    config.credentials = {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim()
    };
  }

  return new CognitoIdentityProviderClient(config);
}

export async function POST(request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    // 1. Find the pending invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: true,
        profile: true
      }
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
      return NextResponse.json({ error: "This invitation link has expired." }, { status: 400 });
    }

    // 2. AWS Cognito User Creation & Auto-Confirmation (No OTP needed)
    const userPoolId = process.env.NEXT_PUBLIC_AWS_USER_POOL_ID;
    const cognitoClient = getCognitoClient();
    let cognitoSub = null;

    try {
      // Step A: AdminCreateUser command sends SUPPRESS so no temp password email is sent
      const createCommand = new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: invitation.email,
        UserAttributes: [
          { Name: 'email', Value: invitation.email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'name', Value: invitation.name || invitation.email.split('@')[0] }
        ],
        MessageAction: 'SUPPRESS' // User ko Cognito default email nahi jayegi
      });

      const cognitoUser = await cognitoClient.send(createCommand);
      const subAttr = cognitoUser.User?.Attributes?.find(attr => attr.Name === 'sub');
      cognitoSub = subAttr?.Value;

      // Step B: Permanent Password set karein (Permanent: true sets status to CONFIRMED)
      const setPasswordCommand = new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: invitation.email,
        Password: password,
        Permanent: true
      });
      await cognitoClient.send(setPasswordCommand);

    } catch (cognitoError) {
      console.error("Cognito user creation error:", cognitoError);

      if (cognitoError.name === 'UsernameExistsException') {
        // User already exists in Cognito - bas password update karein
        try {
          const setPasswordCommand = new AdminSetUserPasswordCommand({
            UserPoolId: userPoolId,
            Username: invitation.email,
            Password: password,
            Permanent: true
          });
          await cognitoClient.send(setPasswordCommand);
        } catch (pwErr) {
          console.warn("Failed to reset password for existing Cognito user:", pwErr);
        }
      } else {
        return NextResponse.json({
          error: cognitoError.message || "Failed to create user in authentication provider."
        }, { status: 500 });
      }
    }

    // Fallback ID if sub not directly captured
    const finalUserId = cognitoSub || `user-${Date.now()}`;

    // 3. Database User Upsert / Create with onboardingCompleted: true
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: finalUserId },
          { email: invitation.email }
        ]
      }
    });

    let savedUser;
    if (existingUser) {
      savedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          organizationId: invitation.organizationId,
          profileId: invitation.profileId,
          name: invitation.name || existingUser.name,
          nickname: invitation.nickname || existingUser.nickname,
          role: invitation.role || existingUser.role,
          reportsToId: invitation.reportsToId || existingUser.reportsToId,
          isActive: true,
          onboardingCompleted: true
        }
      });
    } else {
      savedUser = await prisma.user.create({
        data: {
          id: finalUserId,
          email: invitation.email,
          name: invitation.name || null,
          nickname: invitation.nickname || null,
          role: invitation.role || null,
          reportsToId: invitation.reportsToId || null,
          organizationId: invitation.organizationId,
          profileId: invitation.profileId,
          isActive: true,
          onboardingCompleted: true
        }
      });
    }

    // 4. Mark Invitation as ACCEPTED
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' }
    });

    return NextResponse.json({
      success: true,
      message: "Account activated successfully!",
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name: savedUser.name
      },
      orgName: invitation.organization?.name || 'Workspace'
    }, { status: 200 });

  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
