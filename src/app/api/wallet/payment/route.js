import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import Razorpay from 'razorpay';

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

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: 'rzp_test_TLcyKjhq5um2hn',
      key_secret: 'S4BT9d3D554vrSMYmEzOhgU4',
    });

    // Create an order
    // amount in paise (rechargeAmount * 100)
    // receipt max length is 40 chars
    const shortOrgId = session.organizationId.substring(0, 8);
    const options = {
      amount: Math.round(rechargeAmount * 100), 
      currency: 'INR',
      receipt: `rcpt_${shortOrgId}_${Date.now()}`,
      notes: {
        organizationId: session.organizationId,
      }
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({ 
      success: true, 
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create payment order',
      details: error.message || error.description || String(error)
    }, { status: 500 });
  }
}
