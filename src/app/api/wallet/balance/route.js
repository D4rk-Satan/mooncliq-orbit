import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const session = await getAuthUser(request);
    if (!session?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: { walletBalance: true }
    });

    return NextResponse.json({ balance: org?.walletBalance || 0 });
  } catch (error) {
    console.error('Wallet balance fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}
