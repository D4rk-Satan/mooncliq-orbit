import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUser } from '../../../lib/auth';

// Universal Helper to check tag usage across ALL modules (SQL relations + JSON customData)
async function getTagUsage(tagId, organizationId) {
  try {
    // 1. Check direct relations (Lead & Deal)
    const relCount = await prisma.tag.findUnique({
      where: { id: tagId },
      select: {
        _count: {
          select: { leads: true, deals: true }
        }
      }
    });

    let total = (relCount?._count?.leads || 0) + (relCount?._count?.deals || 0);
    if (total > 0) return total;

    // 2. Check Tasks (customData.tags array contains tagId)
    const taskCount = await prisma.task.count({
      where: {
        organizationId,
        customData: {
          path: ['tags'],
          array_contains: tagId
        }
      }
    });
    total += taskCount;
    if (total > 0) return total;

    // 3. Check Accounts (customData.tags)
    const accountCount = await prisma.account.count({
      where: {
        organizationId,
        customData: {
          path: ['tags'],
          array_contains: tagId
        }
      }
    });
    total += accountCount;
    if (total > 0) return total;

    // 4. Check Products (customData.tags)
    const productCount = await prisma.product.count({
      where: {
        organizationId,
        customData: {
          path: ['tags'],
          array_contains: tagId
        }
      }
    });
    total += productCount;
    if (total > 0) return total;

    // 5. Check ALL Custom Modules (CustomRecord.customData.tags)
    const customRecordCount = await prisma.customRecord.count({
      where: {
        organizationId,
        customData: {
          path: ['tags'],
          array_contains: tagId
        }
      }
    });
    total += customRecordCount;

    return total;
  } catch (err) {
    console.error("Error in getTagUsage:", err);
    return 0;
  }
}


export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const moduleType = searchParams.get("moduleType") || "Lead";
    const activeOnly = searchParams.get("activeOnly") === "true";

    const whereClause = {
      organizationId: user.organizationId,
      moduleType
    };

    if (activeOnly) {
      whereClause.isActive = true;
    }

    const tags = await prisma.tag.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' }
    });
    // Check usage across all modules in parallel
    const tagsWithUsage = await Promise.all(
      tags.map(async (tag) => {
        const usage = await getTagUsage(tag.id, user.organizationId);
        return {
          ...tag,
          usageCount: usage,
          isInUse: usage > 0
        };
      })
    );
    return NextResponse.json(tagsWithUsage);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { name, color, moduleType = "Lead" } = data;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const newTag = await prisma.tag.create({
      data: {
        organizationId: user.organizationId,
        moduleType,
        name,
        color: color || "#ef4444"
      }
    });

    return NextResponse.json(newTag, { status: 201 });
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing tag ID" }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.tag.findFirst({
      where: { id, organizationId: user.organizationId }
    });

    if (!existing) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }
    // 🔒 UNIVERSAL USAGE CHECK (Across Lead, Deal, Task, Account, Product, Custom Modules)
    const usage = await getTagUsage(id, user.organizationId);
    if (usage > 0) {
      return NextResponse.json({
        error: "This tag is attached to active records and cannot be deleted. Please mark it Inactive instead."
      }, { status: 400 });
    }
    await prisma.tag.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, isActive } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Missing tag ID" }, { status: 400 });
    }

    const updatedTag = await prisma.tag.update({
      where: { id },
      data: { isActive }
    });

    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error("Error updating tag status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}