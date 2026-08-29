import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const bp = await prisma.blueprint.findFirst();
  return NextResponse.json({ bpId: bp.id });
}
