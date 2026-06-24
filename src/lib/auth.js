import { CognitoJwtVerifier } from "aws-jwt-verify";
import prisma from "./prisma";

// Create verifier that expects valid access tokens
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID,
  tokenUse: "id", // Or "access", depending on what we pass from frontend
  clientId: process.env.NEXT_PUBLIC_AWS_USER_POOL_CLIENT_ID,
});

export async function getAuthUser(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new Error("Malformed Authorization header");
    }

    // Verify token
    const payload = await verifier.verify(token);
    const userId = payload.sub;
    const email = payload.email;

    // Check if user exists in database
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true }
    });

    if (!user) {
      // Auto-provisioning!
      // 1. Create Organization
      const orgName = email ? `${email.split('@')[0]}'s Workspace` : 'My Workspace';
      
      const newOrg = await prisma.organization.create({
        data: {
          name: orgName,
        }
      });

      // 2. Create User
      user = await prisma.user.create({
        data: {
          id: userId,
          email: email || '',
          organizationId: newOrg.id
        },
        include: { organization: true }
      });

      // 3. Create Default Blueprint & Stages for their Kanban board
      const defaultBlueprint = await prisma.blueprint.create({
        data: {
          organizationId: newOrg.id,
          moduleType: 'Lead',
          name: 'Default Pipeline',
        }
      });

      await prisma.stage.createMany({
        data: [
          { blueprintId: defaultBlueprint.id, name: 'New', orderIndex: 1, color: '#3b82f6' },
          { blueprintId: defaultBlueprint.id, name: 'Contacted', orderIndex: 2, color: '#eab308' },
          { blueprintId: defaultBlueprint.id, name: 'Qualified', orderIndex: 3, color: '#8b5cf6' },
          { blueprintId: defaultBlueprint.id, name: 'Closed', orderIndex: 4, color: '#22c55e' },
        ]
      });
    }

    return user;
  } catch (error) {
    console.error("Auth Error:", error);
    return null;
  }
}
