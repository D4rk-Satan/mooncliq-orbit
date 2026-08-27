import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const bps = await prisma.blueprint.findMany();
    
    const summaries = bps.map(bp => ({
      id: bp.id,
      moduleType: bp.moduleType,
      stages: bp.stages
    }));

    return NextResponse.json(summaries);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
