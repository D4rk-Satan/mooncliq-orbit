import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function POST(request) {
  try {
    const data = await request.json();
    const { updates } = data; // updates = [{ id: 'stage1', orderIndex: 0 }, { id: 'stage2', orderIndex: 1 }]

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: "Invalid updates array" }, { status: 400 });
    }

    // Prisma doesn't have a bulk update with different values per row, so we use a transaction
    const updatePromises = updates.map(update =>
      prisma.stage.update({
        where: { id: update.id },
        data: { orderIndex: update.orderIndex }
      })
    );

    await prisma.$transaction(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering stages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
