import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const session = await getAuthUser(request);
    if (!session?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await request.json();
    const rechargeAmount = parseFloat(amount);

    if (isNaN(rechargeAmount) || rechargeAmount <= 0) {
      return NextResponse.json({ error: 'Invalid recharge amount' }, { status: 400 });
    }

    // MOCK IMPLEMENTATION: Directly credit the wallet instead of calling Razorpay
    await prisma.$transaction([
      prisma.organization.update({
        where: { id: session.organizationId },
        data: { walletBalance: { increment: rechargeAmount } }
      }),
      prisma.walletTransaction.create({
        data: {
          organizationId: session.organizationId,
          amount: rechargeAmount,
          type: 'CREDIT',
          description: 'Wallet Recharge (Mock)',
          referenceId: 'MOCK_REF_' + Date.now(),
        }
      })
    ]);

    return NextResponse.json({ success: true, message: `Successfully added ₹${rechargeAmount} to wallet` });
  } catch (error) {
    console.error('Wallet payment/recharge error:', error);
    return NextResponse.json({ error: 'Failed to process recharge' }, { status: 500 });
  }
}
