import prisma from './prisma';

export async function deductBalance(organizationId, amount, description) {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!org) {
      throw new Error("Organization not found.");
    }

    if (org.walletBalance < amount) {
      throw new Error("Insufficient wallet balance.");
    }

    // Deduct and create transaction atomically
    await prisma.$transaction([
      prisma.organization.update({
        where: { id: organizationId },
        data: { walletBalance: { decrement: amount } }
      }),
      prisma.walletTransaction.create({
        data: {
          organizationId,
          amount,
          type: 'DEBIT',
          description,
        }
      })
    ]);

    return true;
  } catch (error) {
    console.error("Deduct balance error:", error);
    return false;
  }
}
