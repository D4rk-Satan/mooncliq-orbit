import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const gstNumber = searchParams.get('gst')?.trim().toUpperCase();

    if (!gstNumber || gstNumber.length !== 15) {
      return NextResponse.json({ exists: false });
    }

    // Check if any Organization already has this GST
    const count = await prisma.organization.count({
      where: { gstNumber: gstNumber }
    });

    return NextResponse.json({ exists: count > 0 });
  } catch (error) {
    console.error('[Check GST API] Error:', error);
    return NextResponse.json({ exists: false }, { status: 500 });
  }
}
