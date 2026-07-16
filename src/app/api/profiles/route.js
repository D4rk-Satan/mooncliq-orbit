import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUser } from '../../../lib/auth';

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profiles = await prisma.profile.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(profiles);
  } catch (error) {
    console.error("Failed to fetch profiles:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.profile?.canAccessSettings) {
       return NextResponse.json({ error: "Forbidden: Requires Settings Access" }, { status: 403 });
    }

    const data = await request.json();
    const { name, canAccessSettings, canManageUsers, canExportData, permissions } = data;

    const newProfile = await prisma.profile.create({
      data: {
        organizationId: user.organizationId,
        name: name || 'New Profile',
        canAccessSettings: canAccessSettings || false,
        canManageUsers: canManageUsers || false,
        canExportData: canExportData || false,
        permissions: permissions || {
            "Lead": { "read": true, "create": false, "update": false, "delete": false },
            "Account": { "read": true, "create": false, "update": false, "delete": false },
            "Task": { "read": true, "create": false, "update": false, "delete": false },
            "Product": { "read": true, "create": false, "update": false, "delete": false }
        }
      }
    });

    return NextResponse.json(newProfile);
  } catch (error) {
    console.error("Error creating profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.profile?.canAccessSettings) {
       return NextResponse.json({ error: "Forbidden: Requires Settings Access" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const data = await request.json();
    
    // Verify ownership
    const existing = await prisma.profile.findUnique({ where: { id }});
    if (!existing || existing.organizationId !== user.organizationId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.profile.update({
      where: { id },
      data: {
        name: data.name,
        canAccessSettings: data.canAccessSettings,
        canManageUsers: data.canManageUsers,
        canExportData: data.canExportData,
        permissions: data.permissions
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.profile?.canAccessSettings) {
       return NextResponse.json({ error: "Forbidden: Requires Settings Access" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const existing = await prisma.profile.findUnique({ where: { id }});
    if (!existing || existing.organizationId !== user.organizationId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check if in use
    const usersCount = await prisma.user.count({ where: { profileId: id }});
    if (usersCount > 0) {
        return NextResponse.json({ error: "Cannot delete profile that is assigned to users" }, { status: 400 });
    }

    await prisma.profile.delete({ where: { id }});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
