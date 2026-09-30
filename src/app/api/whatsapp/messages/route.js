import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Fetch messages where this phone number is either sender or receiver
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { toPhone: phone },
          { fromPhone: phone }
        ]
      },
      orderBy: {
        createdAt: 'asc' // Sabse purana message upar, naya message neeche
      }
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Fetch Messages Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
