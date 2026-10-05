import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUser } from '../../../lib/auth';

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = user.organizationId;
    const isSuperAdmin = user.profile?.canAccessSettings;

    // --- Role-Based Data Isolation ---
    const leadWhere = { organizationId: orgId };
    const dealWhere = { organizationId: orgId };
    const taskWhere = { organizationId: orgId };

    if (!isSuperAdmin) {
      // Agent only sees their own data
      leadWhere.owner = user.email;
      dealWhere.owner = user.email;
      taskWhere.owner = user.email;
    }

    // 7 Din pehle ki date nikalna
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Run queries in parallel for maximum speed
    const [
      totalLeadsCount,
      totalOpportunityCount,
      wonDealsAgg,
      leadsByStageGroup,
      stages,
      recentLeads,
      myTasks,
      recentDeals
    ] = await Promise.all([
      // 1. Total Leads
      prisma.lead.count({ where: leadWhere }),

      // 2. Total Opportunity (Deals)
      prisma.deal.count({ where: dealWhere }),

      // 3. Total Sales (Sum of dealValue where stage name contains 'won')
      prisma.deal.aggregate({
        where: {
          ...dealWhere,
          stage: { name: { contains: 'won', mode: 'insensitive' } }
        },
        _sum: { dealValue: true }
      }),

      // 4. Lead count grouped by stage
      prisma.lead.groupBy({
        by: ['stageId'],
        where: leadWhere,
        _count: { _all: true }
      }),

      // 5. Fetch all stages in the org to map the grouped stage IDs
      prisma.stage.findMany({
        where: {
          blueprint: { organizationId: orgId, moduleType: 'Lead' }
        }
      }),

      // 6. Recent Leads (For Sidebar)
      prisma.lead.findMany({
        where: leadWhere,
        orderBy: { createdAt: 'desc' },
        take: 4,
        include: { stage: true }
      }),

      // 7. My Tasks (For Sidebar)
      prisma.task.findMany({
        where: taskWhere,
        orderBy: { createdAt: 'desc' }, // Or dueDateTime
        take: 4
      }),

      // 8. Recent Deals for time series charts
      prisma.deal.findMany({
        where: {
          ...dealWhere,
          updatedAt: { gte: sevenDaysAgo }
        },
        include: { stage: true }
      })
    ]);

    // Process Sales Data
    const totalSales = wonDealsAgg._sum.dealValue || 0;

    // Process Donut Chart Data (Lead by Status)
    const leadByStatus = [];
    let totalGroupedLeads = 0;

    leadsByStageGroup.forEach(group => {
      const stage = stages.find(s => s.id === group.stageId);
      const count = group._count._all;
      totalGroupedLeads += count;
      leadByStatus.push({
        name: stage ? stage.name : 'Unknown',
        color: stage?.color || '#cbd5e1',
        count: count
      });
    });

    // Check if the dashboard is completely empty (New Org / No Data)
    const isEmpty = totalLeadsCount === 0 && totalOpportunityCount === 0;

    // --- Process Time-Series Data (Area & Bar Chart ke liye) ---
    const chartData = {};
    const last7Days = [];

    // 1. Pichle 7 dino ka ek empty structure banaya
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('en-GB', { weekday: 'short' }); // Jaise "Mon", "Tue"
      const dateString = d.toISOString().split('T')[0]; // "2024-12-14"

      last7Days.push(dateString);
      chartData[dateString] = { day: dayName, dateFull: dateString, won: 0, lost: 0, sales: 0 };
    }

    // 2. Deals ka data us structure me daala
    recentDeals.forEach(deal => {
      const dateString = deal.updatedAt.toISOString().split('T')[0];
      if (chartData[dateString]) {
        const stageName = deal.stage?.name?.toLowerCase() || '';
        if (stageName.includes('won')) {
          chartData[dateString].won += 1;
          chartData[dateString].sales += (deal.dealValue || 0);
        } else if (stageName.includes('lost')) {
          chartData[dateString].lost += 1;
        }
      }
    });

    const timeSeriesData = Object.values(chartData);

    // Build the final optimized response
    const dashboardData = {
      totalLeads: totalLeadsCount,
      totalOpportunity: totalOpportunityCount,
      totalSales: totalSales,
      leadByStatus: {
        total: totalGroupedLeads,
        data: leadByStatus
      },
      recentLeads,
      myTasks,
      timeSeriesData,
      isEmpty // Frontend will use this boolean to show the Welcome State!
    };

    return NextResponse.json(dashboardData, {
      headers: {
        // Cache locally for 60 seconds (Cost effective & Secure for private data!)
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=120'
      }
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
