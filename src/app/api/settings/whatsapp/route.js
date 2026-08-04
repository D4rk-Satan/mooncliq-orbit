import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const session = await getAuthUser(request);
    if (!session?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: { 
        whatsappAccessToken: true,
        whatsappPhoneNumberId: true,
        whatsappWabaId: true
      }
    });

    return NextResponse.json(org || {});
  } catch (error) {
    console.error('WhatsApp Settings fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getAuthUser(request);
    if (!session?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { whatsappAccessToken, whatsappPhoneNumberId, whatsappWabaId } = await request.json();

    const updatedOrg = await prisma.organization.update({
      where: { id: session.organizationId },
      data: {
        whatsappAccessToken,
        whatsappPhoneNumberId,
        whatsappWabaId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('WhatsApp Settings update error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
