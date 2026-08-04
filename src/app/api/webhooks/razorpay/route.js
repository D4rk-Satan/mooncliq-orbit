import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { addFundsToWallet } from '@/lib/billingUtils';

export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const secret = 'my_mooncliq_secret_123';

    if (!signature || !secret) {
      return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
    }

    // Verify Signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Process the event
    const event = JSON.parse(body);

    // We only care about successful payments
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentEntity = event.payload.payment?.entity || event.payload.order?.entity;
      
      // Amount is in paise, convert to INR
      const amountINR = paymentEntity.amount / 100;
      
      // Extract organizationId from notes (which we set during order creation)
      const organizationId = paymentEntity.notes?.organizationId;
      const referenceId = paymentEntity.id;

      if (!organizationId) {
        console.error('Webhook received but no organizationId found in notes', paymentEntity);
        return NextResponse.json({ error: 'Missing organization metadata' }, { status: 400 });
      }

      // Add funds securely using our existing billing engine
      await addFundsToWallet(
        organizationId,
        amountINR,
        'Razorpay Recharge',
        referenceId
      );

      return NextResponse.json({ success: true, message: 'Wallet updated via webhook' });
    }

    // Acknowledge other events
    return NextResponse.json({ success: true, message: 'Event ignored' });
  } catch (error) {
    console.error('Razorpay Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
