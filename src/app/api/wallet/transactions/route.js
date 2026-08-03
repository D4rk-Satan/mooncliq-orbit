import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const session = await getAuthUser(request);
    if (!session?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const transactions = await prisma.walletTransaction.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Wallet transactions fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
