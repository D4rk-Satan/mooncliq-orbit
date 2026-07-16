import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUser } from '../../../lib/auth';

export async function GET(req) {
  try {
    // 1. Update all existing profiles just in case
    await prisma.profile.updateMany({
      data: {
        canAccessSettings: true,
        permissions: {
          "Lead": { "view": true, "create": true, "edit": true, "delete": true, "visibility": "public" },
          "Account": { "view": true, "create": true, "edit": true, "delete": true, "visibility": "public" },
          "Task": { "view": true, "create": true, "edit": true, "delete": true, "visibility": "public" },
          "Product": { "view": true, "create": true, "edit": true, "delete": true, "visibility": "public" }
        }
      }
    });

    // 2. Fix users who have NO profile (rawProfile: null)
    const usersWithoutProfile = await prisma.user.findMany({
      where: { profileId: null }
    });

    for (const user of usersWithoutProfile) {
      const newProfile = await prisma.profile.create({
        data: {
          organizationId: user.organizationId,
          name: "Administrator",
          canAccessSettings: true,
          canManageUsers: true,
          canExportData: true,
          permissions: {
            "Lead": { "view": true, "create": true, "edit": true, "delete": true, "visibility": "public" },
            "Account": { "view": true, "create": true, "edit": true, "delete": true, "visibility": "public" },
            "Task": { "view": true, "create": true, "edit": true, "delete": true, "visibility": "public" },
            "Product": { "view": true, "create": true, "edit": true, "delete": true, "visibility": "public" }
          }
        }
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { profileId: newProfile.id }
      });
    }

    return NextResponse.json({ message: "All profiles fixed and linked!" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
