import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function GET() {
  const systemStageNames = [
    'New', 'Contacted', 'Qualified', 'Close Won', 'Close Lost', 'Junk', 
    'Qualification', 'Proposal', 'Negotiation', 
    'Active', 'In-Active', 
    'Pending', 'Overdue', 'Completed'
  ];

  try {
    const result = await prisma.stage.updateMany({
      where: {
        name: { in: systemStageNames }
      },
      data: {
        isSystem: true
      }
    });

    return NextResponse.json({ success: true, count: result.count, message: "System stages locked successfully!" });
  } catch (error) {
    console.error("Failed to update stages:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
