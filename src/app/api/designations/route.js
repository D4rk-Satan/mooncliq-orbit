import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { withPermission } from '@/lib/rbac';

// GET: Fetch designations for current user's organization
export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { designations: true }
    });

    const designations = (org?.designations && org.designations.length > 0) ? org.designations : [
      "Junior Associate",
      "Senior Associate",
      "Manager",
      "Senior Manager",
      "CEO"
    ];

    // Saath me har designation ka employee count bhi return karte hain (case-insensitive & trimmed)
    const users = await prisma.user.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { role: true }
    });

    const pendingInvites = await prisma.invitation.findMany({
      where: { organizationId: user.organizationId, status: 'PENDING' },
      select: { role: true }
    });

    const countMap = {};
    users.forEach(u => {
      if (u.role) {
        const key = u.role.trim().toLowerCase();
        countMap[key] = (countMap[key] || 0) + 1;
      }
    });

    pendingInvites.forEach(inv => {
      if (inv.role) {
        const key = inv.role.trim().toLowerCase();
        countMap[key] = (countMap[key] || 0) + 1;
      }
    });

    const result = designations.map(d => ({
      name: d,
      assignedCount: countMap[d.trim().toLowerCase()] || 0
    }));

    return NextResponse.json({ designations: result });
  } catch (error) {
    console.error("Failed to fetch designations:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Add a new designation
export const POST = withPermission('Settings', 'manageUsers', async (request, user) => {
  try {
    const { name } = await request.json();
    const cleanName = (name || '').trim();

    if (!cleanName) {
      return NextResponse.json({ error: "Designation name is required" }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { designations: true }
    });

    const currentList = org?.designations || [];

    // Duplicate Check (Case-insensitive)
    const exists = currentList.some(d => d.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      return NextResponse.json({ error: `Designation "${cleanName}" already exists!` }, { status: 400 });
    }

    const updatedList = [...currentList, cleanName];

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: { designations: updatedList }
    });

    return NextResponse.json({ success: true, designations: updatedList });
  } catch (error) {
    console.error("Failed to add designation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

// PUT: Edit / Rename a designation (Spelling mistake fix + Auto-update on employees)
export const PUT = withPermission('Settings', 'manageUsers', async (request, user) => {
  try {
    const { oldName, newName } = await request.json();
    const cleanOld = (oldName || '').trim();
    const cleanNew = (newName || '').trim();

    if (!cleanOld || !cleanNew) {
      return NextResponse.json({ error: "Both old and new designation names are required" }, { status: 400 });
    }

    if (cleanOld.toLowerCase() === cleanNew.toLowerCase()) {
      return NextResponse.json({ error: "New name must be different" }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { designations: true }
    });

    const currentList = org?.designations || [];

    // Check if new name already exists
    const duplicate = currentList.some(d => d.toLowerCase() === cleanNew.toLowerCase());
    if (duplicate) {
      return NextResponse.json({ error: `Designation "${cleanNew}" already exists!` }, { status: 400 });
    }

    const updatedList = currentList.map(d => d === cleanOld ? cleanNew : d);

    // Atomic: Update organization list + all employees who currently have this role
    await prisma.$transaction([
      prisma.organization.update({
        where: { id: user.organizationId },
        data: { designations: updatedList }
      }),
      prisma.user.updateMany({
        where: { organizationId: user.organizationId, role: cleanOld },
        data: { role: cleanNew }
      }),
      prisma.invitation.updateMany({
        where: { organizationId: user.organizationId, role: cleanOld },
        data: { role: cleanNew }
      })
    ]);

    return NextResponse.json({ success: true, message: `Renamed to "${cleanNew}" and updated on existing employees!` });
  } catch (error) {
    console.error("Failed to rename designation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

// DELETE: Delete a designation (with Dependency Lock)
export const DELETE = withPermission('Settings', 'manageUsers', async (request, user) => {
  try {
    const { name } = await request.json();
    const cleanName = (name || '').trim();

    if (!cleanName) {
      return NextResponse.json({ error: "Designation name is required" }, { status: 400 });
    }

    // 1. Dependency Check: Kya kisi user ko assigned hai?
    const assignedUserCount = await prisma.user.count({
      where: { organizationId: user.organizationId, role: cleanName, isActive: true }
    });

    const pendingInviteCount = await prisma.invitation.count({
      where: { organizationId: user.organizationId, role: cleanName, status: 'PENDING' }
    });

    if (assignedUserCount > 0 || pendingInviteCount > 0) {
      return NextResponse.json({
        error: `Cannot delete "${cleanName}". It is currently assigned to ${assignedUserCount} active member(s) and ${pendingInviteCount} invite(s). Reassign them first.`
      }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { designations: true }
    });

    const updatedList = (org?.designations || []).filter(d => d !== cleanName);

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: { designations: updatedList }
    });

    return NextResponse.json({ success: true, message: `Designation "${cleanName}" deleted successfully.` });
  } catch (error) {
    console.error("Failed to delete designation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});
