import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { withPermission } from "../../../lib/rbac";
import { getAuthUser, clearUserCache } from "../../../lib/auth";
import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from "@aws-sdk/client-cognito-identity-provider";




const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.NEXT_PUBLIC_AWS_COGNITO_REGION || process.env.AWS_REGION || "ap-south-1"
});

// GET: Authenticated users can fetch active members of their organization (for Task assignment & mentions)
export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }



    // Agar checkRecords query aayi ho to counts return karo
    const checkUserId = request.nextUrl.searchParams.get("checkRecords");
    if (checkUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: checkUserId, organizationId: user.organizationId }
      });

      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const identifiers = [
        targetUser.id,
        targetUser.email,
        targetUser.name,
        targetUser.nickname
      ].filter(Boolean);

      const ownerCondition = {
        organizationId: user.organizationId,
        owner: { in: identifiers }
      };

      const [leadsCount, dealsCount, tasksCount, customRecordsCount] = await Promise.all([
        prisma.lead.count({ where: ownerCondition }),
        prisma.deal.count({ where: ownerCondition }),
        prisma.task.count({ where: ownerCondition }),
        prisma.customRecord.count({ where: ownerCondition })
      ]);

      const totalRecords = leadsCount + dealsCount + tasksCount + customRecordsCount;

      return NextResponse.json({
        leadsCount,
        dealsCount,
        tasksCount,
        customRecordsCount,
        totalRecords,
        userName: targetUser.name || targetUser.nickname || targetUser.email
      });
    }


    const users = await prisma.user.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      include: {
        profile: true,
        reportsTo: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { email: "asc" }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const PATCH = withPermission('Settings', 'manageUsers', async (request, user) => {
  try {
    const { userId, isActive, role, reportsToId, profileId, name, nickname, avatarUrl, reassignToUserId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (isActive === false && userId === user.id) {
      return NextResponse.json({ error: "You cannot revoke your own access!" }, { status: 400 });
    }


    // AGAR USER KO REVOKE / OFFBOARD KAR RAHE HAIN AUR REASSIGN BHI KARNA HAI:
    if (isActive === false && reassignToUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId, organizationId: user.organizationId }
      });
      const newOwnerUser = await prisma.user.findUnique({
        where: { id: reassignToUserId, organizationId: user.organizationId }
      });

      if (!targetUser || !newOwnerUser) {
        return NextResponse.json({ error: "Target or Replacement user not found." }, { status: 404 });
      }

      const oldIdentifiers = [
        targetUser.id,
        targetUser.email,
        targetUser.name,
        targetUser.nickname
      ].filter(Boolean);

      const oldOwnerName = targetUser.nickname || targetUser.name || targetUser.email;
      const newOwnerName = newOwnerUser.nickname || newOwnerUser.name || newOwnerUser.email;
      const newOwnerIdentifier = newOwnerUser.nickname || newOwnerUser.name || newOwnerUser.email || newOwnerUser.id;

      // 1. Saare affected records fetch karo taaki har ek me Audit Log daal sakein
      const [affectedLeads, affectedDeals, affectedTasks, affectedCustomRecords] = await Promise.all([
        prisma.lead.findMany({ where: { organizationId: user.organizationId, owner: { in: oldIdentifiers } }, select: { id: true } }),
        prisma.deal.findMany({ where: { organizationId: user.organizationId, owner: { in: oldIdentifiers } }, select: { id: true } }),
        prisma.task.findMany({ where: { organizationId: user.organizationId, owner: { in: oldIdentifiers } }, select: { id: true } }),
        prisma.customRecord.findMany({ where: { organizationId: user.organizationId, owner: { in: oldIdentifiers } }, select: { id: true } })
      ]);

      // 2. Audit Log entries taiyaar karo (SlideOver Activity me clearly display hone ke liye)
      const auditLogData = [];
      const createLogItem = (recordId, moduleType) => ({
        organizationId: user.organizationId,
        moduleType,
        recordId: String(recordId),
        userId: user.id,
        userEmail: user.email,
        actionType: 'OWNERSHIP_REASSIGNED',
        details: {
          message: `Ownership transferred from ${oldOwnerName} to ${newOwnerName} (User Offboarded by Admin)`,
          previousOwner: oldOwnerName,
          newOwner: newOwnerName
        }
      });

      affectedLeads.forEach(r => auditLogData.push(createLogItem(r.id, 'Lead')));
      affectedDeals.forEach(r => auditLogData.push(createLogItem(r.id, 'Deal')));
      affectedTasks.forEach(r => auditLogData.push(createLogItem(r.id, 'Task')));
      affectedCustomRecords.forEach(r => auditLogData.push(createLogItem(r.id, 'CustomModule')));

      // 3. Single Atomic Transaction: Reassign + Audit Logs + Subordinates unlink + Hard Delete
      await prisma.$transaction([
        // A. Records reassign karo
        prisma.lead.updateMany({
          where: { organizationId: user.organizationId, owner: { in: oldIdentifiers } },
          data: { owner: newOwnerIdentifier }
        }),
        prisma.deal.updateMany({
          where: { organizationId: user.organizationId, owner: { in: oldIdentifiers } },
          data: { owner: newOwnerIdentifier }
        }),
        prisma.task.updateMany({
          where: { organizationId: user.organizationId, owner: { in: oldIdentifiers } },
          data: { owner: newOwnerIdentifier }
        }),
        prisma.customRecord.updateMany({
          where: { organizationId: user.organizationId, owner: { in: oldIdentifiers } },
          data: { owner: newOwnerIdentifier }
        }),

        // B. Bulk Audit logs insert karo
        ...(auditLogData.length > 0 ? [prisma.auditLog.createMany({ data: auditLogData })] : []),

        // C. Subordinates ka reportsTo null karo (taaki foreign key na toote)
        prisma.user.updateMany({
          where: { reportsToId: userId, organizationId: user.organizationId },
          data: { reportsToId: null }
        }),

        // D. Database se User ko HARD DELETE karo
        prisma.user.delete({
          where: { id: userId, organizationId: user.organizationId }
        })
      ]);

      // E. AWS Cognito se User ko permanently DELETE karo
      try {
        const userPoolId = process.env.NEXT_PUBLIC_AWS_USER_POOL_ID;
        if (userPoolId && targetUser.email) {
          await cognitoClient.send(new AdminDeleteUserCommand({
            UserPoolId: userPoolId,
            Username: targetUser.email
          }));
          console.log(`[Cognito] Successfully deleted user ${targetUser.email} from pool ${userPoolId}`);
        }
      } catch (cognitoErr) {
        // Agar user pehle se Cognito me na ho ya already deleted ho to execution na ruke
        console.warn("[Cognito] AdminDeleteUser warning:", cognitoErr.message);
      }

      return NextResponse.json({
        success: true,
        message: `All ${auditLogData.length} records successfully reassigned to ${newOwnerName}, timeline logged, and user permanently removed from Database & Cognito.`
      });
    }

    // Prevent cyclic hierarchy (user cannot report to themselves)
    if (reportsToId && reportsToId === userId) {
      return NextResponse.json({ error: "A user cannot report to themselves!" }, { status: 400 });
    }

    const updateData = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (role !== undefined) updateData.role = role ? role.trim() : null;
    if (reportsToId !== undefined) updateData.reportsToId = reportsToId || null;
    if (profileId !== undefined) updateData.profileId = profileId || null;
    if (name !== undefined) updateData.name = name ? name.trim() : null;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl || null;
    if (nickname !== undefined) {
      const cleanNick = nickname ? nickname.trim().toLowerCase() : null;
      if (cleanNick) {
        // Unique check in organization (excluding self)
        const duplicate = await prisma.user.findFirst({
          where: {
            organizationId: user.organizationId,
            nickname: { equals: cleanNick, mode: 'insensitive' },
            id: { not: userId }
          }
        });
        if (duplicate) {
          return NextResponse.json({ error: `Nickname "${cleanNick}" is already taken.` }, { status: 400 });
        }
      }
      updateData.nickname = cleanNick;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId, organizationId: user.organizationId },
      data: updateData,
      include: {
        profile: true,
        reportsTo: {
          select: {
            id: true,
            name: true,
            nickname: true,
            email: true,
            role: true
          }
        }
      }
    });
    clearUserCache(userId);
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});
