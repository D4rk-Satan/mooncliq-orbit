import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

/**
 * API Endpoint for orbit.task.getMovedLeadsCount(ownerEmail, { since, until })
 */
export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const since = searchParams.get('since');
    const until = searchParams.get('until');
    const moduleType = (searchParams.get('moduleType') || 'Lead').trim();

    const whereClause = {
      organizationId: user.organizationId
    };

    if (owner && owner.trim().length > 0) {
      whereClause.owner = owner.trim();
    }

    // Date range filter
    const dateFilter = {};
    if (since) {
      dateFilter.gte = new Date(since);
    } else {
      // Default: today start
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      dateFilter.gte = todayStart;
    }

    if (until) {
      dateFilter.lte = new Date(until);
    }

    whereClause.updatedAt = dateFilter;

    let count = 0;
    const lower = moduleType.toLowerCase();

    if (lower === 'lead') {
      count = await prisma.lead.count({ where: whereClause });
    } else if (lower === 'deal') {
      count = await prisma.deal.count({ where: whereClause });
    } else if (lower === 'task') {
      count = await prisma.task.count({ where: whereClause });
    } else if (lower === 'account') {
      count = await prisma.account.count({ where: whereClause });
    } else if (lower === 'product') {
      count = await prisma.product.count({ where: whereClause });
    } else {
      // Custom Module Record count
      const cm = await prisma.customModule.findFirst({
        where: { organizationId: user.organizationId, name: moduleType }
      });
      if (cm) {
        whereClause.customModuleId = cm.id;
      }
      count = await prisma.customRecord.count({ where: whereClause });
    }

    return NextResponse.json({
      success: true,
      owner: owner || 'all',
      count
    });

  } catch (error) {
    console.error('Error in /api/tasks/audit-rep:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
