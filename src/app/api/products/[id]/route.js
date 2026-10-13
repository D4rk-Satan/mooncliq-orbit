import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { withPermission } from '../../../../lib/rbac';

export async function DELETE(request, context) {
  return withPermission('Product', 'delete', async (req, user) => {
    try {
      const { id } = await context.params;

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
  })(request, context);
}
