import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { getAuthUser } from '../../../../lib/auth';
import Papa from 'papaparse';

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Apply basic permission logic
    if (!user.profile?.canAccessSettings && !user.profile?.permissions?.Lead?.view) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view Leads" }, { status: 403 });
    }

    const whereClause = { organizationId: user.organizationId };
    if (!user.profile?.canAccessSettings && user.profile?.permissions?.Lead?.visibility === 'private') {
      whereClause.owner = user.email;
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        stage: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform leads to a flat structure for CSV
    const flatLeads = leads.map(lead => {
      const flat = {
        id: lead.id,
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        email: lead.email || '',
        phone: lead.phone || '',
        owner: lead.owner || '',
        stage: lead.stage?.name || 'Unknown',
        createdAt: lead.createdAt.toISOString()
      };

      // Extract customData if it exists
      let customData = lead.customData;
      if (typeof customData === 'string') {
        try { customData = JSON.parse(customData); } catch (e) { customData = {}; }
      }

      if (customData && typeof customData === 'object') {
        Object.keys(customData).forEach(key => {
          // Flatten nested objects nicely or convert to string
          flat[`custom_${key}`] = typeof customData[key] === 'object' ? JSON.stringify(customData[key]) : customData[key];
        });
      }

      return flat;
    });

    const csvStr = Papa.unparse(flatLeads);

    return new NextResponse(csvStr, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="leads_export.csv"'
      }
    });

  } catch (error) {
    console.error("Error exporting leads:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
