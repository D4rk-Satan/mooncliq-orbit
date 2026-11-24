import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, clearUserCache } from '@/lib/auth';
import { withPermission } from '@/lib/rbac';

export const POST = withPermission('Settings', 'manageUsers', async (request, currentUser) => {
  try {
    const { targetUserId, newAdminRole, currentAdminRole, currentAdminProfileId, reassignRecords } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: "Target user is required." }, { status: 400 });
    }

    if (targetUserId === currentUser.id) {
      return NextResponse.json({ error: "Cannot transfer ownership to yourself." }, { status: 400 });
    }

    // 1. Target user fetch karein
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId, organizationId: currentUser.organizationId },
      include: { profile: true }
    });

    if (!targetUser || !targetUser.isActive) {
      return NextResponse.json({ error: "Target user not found or inactive." }, { status: 404 });
    }

    // 2. Administrator profile locate karein
    const adminProfile = await prisma.profile.findFirst({
      where: {
        organizationId: currentUser.organizationId,
        OR: [
          { canAccessSettings: true },
          { name: { in: ['Administrator', 'Superadmin', 'Admin', 'administrator', 'superadmin', 'admin'] } }
        ]
      }
    });

    if (!adminProfile) {
      return NextResponse.json({ error: "Administrator profile template not found." }, { status: 500 });
    }

    // 3. Purane Super Admin ke liye selected profile validate karein (cannot be admin profile)
    let finalOldAdminProfileId = currentAdminProfileId || targetUser.profileId; // default swap with target's profile
    if (finalOldAdminProfileId === adminProfile.id) {
      // Find a non-admin profile fallback
      const nonAdminFallback = await prisma.profile.findFirst({
        where: {
          organizationId: currentUser.organizationId,
          canAccessSettings: false,
          id: { not: adminProfile.id }
        }
      });
      finalOldAdminProfileId = nonAdminFallback ? nonAdminFallback.id : targetUser.profileId;
    }

    const targetRoleName = (newAdminRole || 'CEO').trim();
    const currentRoleName = (currentAdminRole || 'Junior Associate').trim();

    // 4. ATOMIC DATABASE TRANSACTION
    await prisma.$transaction(async (tx) => {
      // Step A: Target user ko promote karein -> Superadmin Profile, Top Level (reportsTo = null), New Role
      await tx.user.update({
        where: { id: targetUser.id },
        data: {
          profileId: adminProfile.id,
          reportsToId: null, // Always Top Level Root
          role: targetRoleName
        }
      });

      // Step B: Purane Superadmin ko demote karein -> Selected Profile, reportsTo = Target User, New Role
      await tx.user.update({
        where: { id: currentUser.id },
        data: {
          profileId: finalOldAdminProfileId,
          reportsToId: targetUser.id,
          role: currentRoleName
        }
      });

      // Step C: Jo log pehle purane Super Admin ko report kar rahe the, unka manager ab Target User ban jaye
      await tx.user.updateMany({
        where: {
          organizationId: currentUser.organizationId,
          reportsToId: currentUser.id,
          id: { not: targetUser.id }
        },
        data: {
          reportsToId: targetUser.id
        }
      });

      // Step D: Agar reassignRecords maanga gaya ho, toh saare records transfer karein
      if (reassignRecords) {
        const oldIdentifiers = [
          currentUser.id,
          currentUser.email,
          currentUser.name,
          currentUser.nickname
        ].filter(Boolean);

        const newOwnerIdentifier = targetUser.nickname || targetUser.name || targetUser.email || targetUser.id;

        const updateConditions = {
          where: {
            organizationId: currentUser.organizationId,
            owner: { in: oldIdentifiers }
          },
          data: {
            owner: newOwnerIdentifier
          }
        };

        await Promise.all([
          tx.lead.updateMany(updateConditions),
          tx.deal.updateMany(updateConditions),
          tx.task.updateMany(updateConditions),
          tx.customRecord.updateMany(updateConditions)
        ]);

        // Audit log
        await tx.auditLog.create({
          data: {
            organizationId: currentUser.organizationId,
            userId: currentUser.id,
            userEmail: currentUser.email,
            actionType: 'OWNERSHIP_TRANSFERRED',
            moduleType: 'Organization',
            details: {
              message: `Superadmin ownership and records transferred from ${currentUser.email} to ${targetUser.email}`,
              transferredFrom: currentUser.email,
              transferredTo: targetUser.email,
              timestamp: new Date().toISOString()
            }
          }
        });
      }
    });

    // 5. Invalidate In-Memory Caches for both users
    clearUserCache(currentUser.id);
    clearUserCache(targetUser.id);

    return NextResponse.json({
      success: true,
      message: `Ownership successfully transferred to ${targetUser.name || targetUser.nickname || targetUser.email}.`
    });

  } catch (error) {
    console.error("Failed to transfer ownership:", error);
    return NextResponse.json({ error: error.message || "Failed to transfer ownership." }, { status: 500 });
  }
});
