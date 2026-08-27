import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function GET(request) {
  try {
    const blueprints = await prisma.blueprint.findMany({
      where: { moduleType: 'Lead' }
    });

    const results = [];
    for (const bp of blueprints) {
      const stages = await prisma.stage.findMany({
        where: { blueprintId: bp.id }
      });
      results.push({
        blueprintId: bp.id,
        stages: stages.map(s => s.name)
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
