import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { deductBalance } from '@/lib/billingUtils';
import { pushToSQS } from '@/lib/sqsUtils';

export async function POST(request) {
  try {
    const session = await getAuthUser(request);
    if (!session?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, targetModule, customFilters, templateBody } = await request.json();

    if (!name || !templateBody || !targetModule) {
      return NextResponse.json({ error: 'Missing campaign details' }, { status: 400 });
    }

    // 1. Fetch Target Records based on customFilters
    const filter = { organizationId: session.organizationId, AND: [], OR: [] };
    
    // Parse custom filters: [{ logic, field, operator, value }]
    if (customFilters && Array.isArray(customFilters)) {
      customFilters.forEach((f, idx) => {
        if (!f.field || !f.value) return;
        
        let condition = {};
        if (f.field === 'tag') {
          // Prisma relation filter for tags
          condition = { tags: { some: { name: { equals: f.value, mode: 'insensitive' } } } };
        } else {
          // Standard lead fields (firstName, stageId, etc.)
          if (f.operator === 'contains') {
             condition = { [f.field]: { contains: f.value, mode: 'insensitive' } };
          } else if (f.operator === 'equals') {
             condition = { [f.field]: f.value };
          } else if (f.operator === 'not_equals') {
             condition = { [f.field]: { not: f.value } };
          }
        }

        if (idx === 0 || f.logic === 'AND') {
          filter.AND.push(condition);
        } else if (f.logic === 'OR') {
          filter.OR.push(condition);
        }
      });
    }
    
    // Cleanup empty arrays so Prisma doesn't complain
    if (filter.AND.length === 0) delete filter.AND;
    if (filter.OR.length === 0) delete filter.OR;
    
    // In reality you might filter by tags or other criteria. 
    // Here we fetch leads or accounts
    const model = targetModule === 'Account' ? prisma.account : prisma.lead;
    const records = await model.findMany({
      where: filter,
      select: { id: true, [targetModule === 'Account' ? 'companyName' : 'firstName']: true, phone: true }
    });

    // Filter records with valid phone numbers
    const validLeads = records.filter(l => l.phone && l.phone.length > 8);
    const totalLeads = validLeads.length;

    if (totalLeads === 0) {
      return NextResponse.json({ error: 'No valid leads found in the target audience' }, { status: 400 });
    }

    // 2. Calculate Cost (Assuming ₹1 per message)
    const estimatedCost = totalLeads * 1.0;

    // 3. Deduct Wallet Balance Upfront
    const deductionSuccess = await deductBalance(session.organizationId, estimatedCost, `Campaign: ${name}`);
    if (!deductionSuccess) {
      return NextResponse.json({ error: 'Insufficient wallet balance.' }, { status: 402 }); // Payment Required
    }

    // 4. Create Campaign Record
    const campaign = await prisma.campaign.create({
      data: {
        organizationId: session.organizationId,
        name,
        templateBody,
        targetStageId: 'custom-query',
        estimatedCost,
        totalLeads,
        status: 'PROCESSING'
      }
    });

    // 5. Push to SQS
    // Prepare the messages
    const messages = validLeads.map(lead => ({
      campaignId: campaign.id,
      organizationId: session.organizationId,
      leadId: lead.id,
      toPhone: lead.phone,
      templateBody,
      variables: { name: lead.firstName }
    }));

    // Async push so we don't block the request if there are thousands
    // But since it batches 10 at a time, for very large lists we might need a separate job
    // For MVP, we await it here (Serverless execution is fast, up to 10-15s for a few thousand)
    const sqsResult = await pushToSQS(messages);

    return NextResponse.json({ 
      success: true, 
      campaignId: campaign.id,
      totalQueued: sqsResult.successful,
      costDeducted: estimatedCost
    });

  } catch (error) {
    console.error('Campaign API Error:', error);
    return NextResponse.json({ error: 'Failed to launch campaign' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const session = await getAuthUser(request);
    if (!session?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('Fetch Campaigns Error:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}
