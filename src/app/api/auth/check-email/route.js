import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// In-memory rate limiting map: IP -> { count, expiresAt }
const rateLimitMap = new Map();

export async function GET(req) {
  try {
    // 1. IP Rate Limiting (Max 20 checks per minute per IP to prevent bot enumeration)
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
    const now = Date.now();
    const rateData = rateLimitMap.get(ip) || { count: 0, expiresAt: now + 60000 };

    if (now > rateData.expiresAt) {
      rateData.count = 0;
      rateData.expiresAt = now + 60000;
    }

    if (rateData.count >= 20) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
    rateData.count++;
    rateLimitMap.set(ip, rateData);

    // 2. Extract & Validate Email parameter
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email')?.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ exists: false });
    }

    // 3. Fast Index Count Query (Takes ~1ms with unique index on User.email)
    const userCount = await prisma.user.count({
      where: {
        email: {
          equals: email,
          mode: 'insensitive'
        }
      }
    });

    return NextResponse.json({ exists: userCount > 0 });
  } catch (error) {
    console.error('[Check Email API] Error:', error);
    return NextResponse.json({ exists: false }, { status: 500 });
  }
}
