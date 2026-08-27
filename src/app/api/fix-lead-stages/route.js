import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const validStageNames = ['New', 'Contacted', 'Qualified', 'Close Won', 'Close Lost', 'Junk'];
    
    // Delete all stages for Lead blueprints that are not in validStageNames
    const result = await prisma.stage.deleteMany({
      where: {
        blueprint: {
          moduleType: 'Lead'
        },
        name: {
          notIn: validStageNames
        }
      }
    });

    return NextResponse.json({ message: `Successfully deleted ${result.count} invalid Lead stages.` });
  } catch (error) {
    console.error("Error deleting lead stages:", error);
    return NextResponse.json({ error: error.message, stack: error.stack });
  }
}
