import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { withPermission } from '../../../../lib/rbac';

export const DELETE = withPermission('Products', 'delete', async (request, user, context) => {
  try {
    const { id } = await context.params;

    // Check if product is used in deals (we can't easily query json arrays in sqlite, but in postgres we could. 
    // Since prisma schema stores Deals.products as Json, it's hard to strictly restrict without parsing.
    // For now, we will just delete the product).
    
    await prisma.product.delete({
      where: { 
        id,
        organizationId: user.organizationId 
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Product delete error:", err);
    return NextResponse.json({ error: "Failed to delete Product" }, { status: 500 });
  }
});
