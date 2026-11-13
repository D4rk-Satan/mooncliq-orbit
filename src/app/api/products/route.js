import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { getAuthUser } from '../../../lib/auth';
import { withPermission } from '@/lib/rbac';
import { getSubordinateUserIds, getUserIdentifiersList } from '../../../lib/hierarchy';

export const POST = withPermission('Product', 'create', async (request, user) => {
  try {

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
});

export const GET = withPermission('Product', 'view', async (request, user) => {

  try {

    let products = await prisma.product.findMany({
      where: { organizationId: user.organizationId },
      include: { stage: true },
      orderBy: { createdAt: 'desc' }
    });

    const productVisibility = user.profile?.permissions?.Product?.visibility || 'public';

    if (!user.profile?.canAccessSettings && (productVisibility === 'private' || productVisibility === 'hierarchy')) {
      const allowedIdentifiers = new Set([
        user.id,
        user.email,
        user.name,
        user.profile?.nickname,
        user.nickname
      ].filter(Boolean).map(val => String(val).trim().toLowerCase()));

      if (productVisibility === 'hierarchy') {
        const subIds = await getSubordinateUserIds(user.id, user.organizationId);
        if (subIds.length > 0) {
          const subIdentifiers = await getUserIdentifiersList(subIds);
          subIdentifiers.forEach(id => allowedIdentifiers.add(id));
        }
      }

      products = products.filter(p => {
        let customData = p.customData;
        if (typeof customData === 'string') {
          try { customData = JSON.parse(customData); } catch (e) { customData = {}; }
        }

        const explicitOwner = String(p.owner || '').trim().toLowerCase();
        const customOwner = String(customData?.owner || '').trim().toLowerCase();
        const isCreator = p.lastModifiedById === user.id;

        const isAllowed = Boolean(
          (explicitOwner && allowedIdentifiers.has(explicitOwner)) ||
          (customOwner && allowedIdentifiers.has(customOwner))
        );

        return isCreator || isAllowed;
      });
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});

export const PATCH = withPermission('Product', 'edit', async (request, user) => {
  try {

    const data = await req.json();
    const { productId, stageId, customData, tags, transitionId, ...standardFields } = data;

    if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });

    let updateData = { ...standardFields };
    if (stageId) updateData.stageId = stageId;
    if (customData) updateData.customData = customData;

    // Format Numbers correctly for Prisma
    if (updateData.unitPrice !== undefined) updateData.unitPrice = parseFloat(updateData.unitPrice) || null;
    if (updateData.costPrice !== undefined) updateData.costPrice = parseFloat(updateData.costPrice) || null;

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData
    });

    if (typeof executeBackendWorkflows === "function") {
      executeBackendWorkflows(user.organizationId, 'Product', 'Edited', updatedProduct);
    }

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("Error updating Product:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});
