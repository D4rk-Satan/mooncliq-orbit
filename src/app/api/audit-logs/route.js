import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

/**
 * GET: Fetch paginated audit history for a specific record (Lead, Task, Deal, etc.)
 * Default limit = 10 records per page (Lazy-loaded on Activity Tab click)
 */
export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!recordId) {
      return NextResponse.json({ error: "recordId is required" }, { status: 400 });
    }

    const skip = (page - 1) * limit;

    // Fetch total count and paginated logs in parallel (Fast!)
    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          organizationId: user.organizationId,
          recordId: String(recordId)
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: skip
      }),
      prisma.auditLog.count({
        where: {
          organizationId: user.organizationId,
          recordId: String(recordId)
        }
      })
    ]);

    // Resolve user IDs to Names / Nicknames for human-friendly timeline display
    const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, nickname: true, email: true, profile: { select: { nickname: true } } }
    });

    const userMap = {};
    users.forEach(u => {
      userMap[u.id] = u.profile?.nickname || u.nickname || u.name || u.email?.split('@')[0] || u.email;
    });

    const enrichedLogs = logs.map(l => ({
      id: l.id,
      actionType: l.actionType,
      details: l.details,
      createdAt: l.createdAt,
      authorName: (l.userId && userMap[l.userId]) || l.userEmail?.split('@')[0] || l.userEmail || "System User"
    }));

    return NextResponse.json({
      logs: enrichedLogs,
      totalCount,
      page,
      limit,
      hasMore: skip + logs.length < totalCount
    });

  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

