import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const leadStages = await prisma.stage.findMany({
    where: { blueprint: { moduleType: 'Lead' } }
  });
  return NextResponse.json(leadStages.map(s => ({ name: s.name, color: s.color })));
}
