import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUser } from '../../../lib/auth';

export async function POST(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.profile?.canAccessSettings && !user.profile?.permissions?.Product?.create) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to create Products" }, { status: 403 });
    }

    const body = await req.json();
    const { name, sku, customData, blueprintId } = body;

    if (!name || !sku || !blueprintId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find the initial stage for this blueprint (Order Index 0)
    let initialStage = await prisma.stage.findFirst({
      where: { blueprintId, orderIndex: 0 }
    });

    // Fallback if no orderIndex 0 exists
    if (!initialStage) {
      initialStage = await prisma.stage.findFirst({
        where: { blueprintId }
      });
    }

        if (!initialStage) {
      initialStage = await prisma.stage.create({
        data: {
          name: 'Default',
          blueprintId,
          orderIndex: 0,
          color: '#e2e8f0'
        }
      });
    }

    const product = await prisma.product.create({
      data: {
        organizationId: user.organizationId,
        blueprintId,
        stageId: initialStage.id,
        name,
        sku,
        customData
      }
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.profile?.canAccessSettings && !user.profile?.permissions?.Product?.view) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view Products" }, { status: 403 });
    }

    let products = await prisma.product.findMany({
      where: { organizationId: user.organizationId },
      include: { stage: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!user.profile?.canAccessSettings && user.profile?.permissions?.Product?.visibility === 'private') {
      products = products.filter(p => {
        let customData = p.customData;
        if (typeof customData === 'string') {
          try { customData = JSON.parse(customData); } catch(e) { customData = {}; }
        }
        return customData?.owner === user.email;
      });
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
