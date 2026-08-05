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

    const { name, targetStageId, templateBody } = await request.json();

    if (!name || !templateBody) {
      return NextResponse.json({ error: 'Missing campaign details' }, { status: 400 });
    }

    // 1. Fetch Target Leads
    const filter = { organizationId: session.organizationId };
    if (targetStageId) {
      filter.stageId = targetStageId;
    }
    
    // In reality you might filter by tags or other criteria. 
    // Here we just fetch leads in the targeted stage (or all leads if not provided)
    const leads = await prisma.lead.findMany({
      where: filter,
      select: { id: true, firstName: true, phone: true }
    });

    // Filter leads with valid phone numbers
    const validLeads = leads.filter(l => l.phone && l.phone.length > 8);
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
        targetStageId,
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
