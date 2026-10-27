import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

/**
 * GET: Fetch recent notifications for logged-in user + unread count
 */
export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.email;

    // Fetch notifications targetted to this user or to all
    const notifications = await prisma.notification.findMany({
      where: {
        organizationId: user.organizationId,
        OR: [
          { userEmail: userEmail },
          { userEmail: '@all' }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const unreadCount = await prisma.notification.count({
      where: {
        organizationId: user.organizationId,
        isRead: false,
        OR: [
          { userEmail: userEmail },
          { userEmail: '@all' }
        ]
      }
    });

    return NextResponse.json({
      notifications,
      unreadCount
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const isInternal = authHeader && (authHeader.includes("internal-service-token") || authHeader.includes("Bearer internal-service-token"));

    let organizationId;
    let fallbackEmail;

    if (isInternal) {
      // Internal execution from Lambda / Workflow Engine
      const body = await request.clone().json();
      organizationId = body.organizationId;
      fallbackEmail = body.targetUser;
    } else {
      const user = await getAuthUser(request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      organizationId = user.organizationId;
      fallbackEmail = user.email;
    }

    const body = await request.json();
    const { targetUser, title, message, type = 'info', actionUrl } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'title and message are required' }, { status: 400 });
    }

    const finalOrgId = organizationId || body.organizationId;
    if (!finalOrgId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    let resolvedUserEmail = targetUser || fallbackEmail || '@all';

    // Agar targetUser ek nickname hai (email nahi hai), to database se uska email find karo
    if (resolvedUserEmail && resolvedUserEmail !== '@all' && !resolvedUserEmail.includes('@')) {
      const matchedProfile = await prisma.profile.findFirst({
        where: {
          organizationId: finalOrgId,
          nickname: { equals: resolvedUserEmail, mode: 'insensitive' }
        },
        include: { users: true }
      });

      if (matchedProfile?.users?.[0]?.email) {
        resolvedUserEmail = matchedProfile.users[0].email;
      }
    }

    const notification = await prisma.notification.create({
      data: {
        organizationId: finalOrgId,
        userEmail: resolvedUserEmail,
        title,
        message,
        type: ['urgent', 'warning', 'success', 'info'].includes(type) ? type : 'info',
        actionUrl: actionUrl || null,
        isRead: false
      }
    });

    return NextResponse.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH: Mark notification as read (single or all)
 */
export async function PATCH(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAll = false } = body;

    if (markAll) {
      await prisma.notification.updateMany({
        where: {
          organizationId: user.organizationId,
          OR: [
            { userEmail: user.email },
            { userEmail: '@all' }
          ]
        },
        data: { isRead: true }
      });
      return NextResponse.json({ success: true, message: 'All marked as read' });
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'notificationId is required' }, { status: 400 });
    }

    const updated = await prisma.notification.update({
      where: {
        id: notificationId,
        organizationId: user.organizationId
      },
      data: { isRead: true }
    });

    return NextResponse.json({ success: true, notification: updated });

  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE: Clear read notifications for logged-in user
 */
export async function DELETE(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      await prisma.notification.delete({
        where: { id, organizationId: user.organizationId }
      });
      return NextResponse.json({ success: true, message: 'Notification deleted' });
    }

    // Default: Clear all read notifications
    const deleted = await prisma.notification.deleteMany({
      where: {
        organizationId: user.organizationId,
        isRead: true,
        OR: [
          { userEmail: user.email },
          { userEmail: '@all' }
        ]
      }
    });

    return NextResponse.json({ success: true, deletedCount: deleted.count });

  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
