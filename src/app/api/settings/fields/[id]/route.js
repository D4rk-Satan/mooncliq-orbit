import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { sectionName, sectionOrder, isHidden } = body;

    const data = {};
    if (sectionName !== undefined) data.sectionName = sectionName;
    if (sectionOrder !== undefined) data.sectionOrder = sectionOrder;
    if (isHidden !== undefined) data.isHidden = isHidden;

    const updatedField = await prisma.field.update({
      where: { id },
      data
    });

    return NextResponse.json(updatedField);
  } catch (error) {
    console.error("Error updating field:", error);
    return NextResponse.json({ error: 'Failed to update field' }, { status: 500 });
  }
}
