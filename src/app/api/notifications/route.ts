import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/notifications - Get notifications for user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ID utilisateur requis' },
        { status: 400 }
      );
    }

    const where: any = { userId };
    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    const unreadCount = await db.notification.count({
      where: { userId, read: false }
    });

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
      count: notifications.length
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, message, type, link } = body;

    if (!userId || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur, titre et message requis' },
        { status: 400 }
      );
    }

    const notification = await db.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || 'info',
        link: link || null
      }
    });

    return NextResponse.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications - Mark as read
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, userId, markAllRead } = body;

    if (markAllRead && userId) {
      // Mark all as read for user
      await db.notification.updateMany({
        where: { userId, read: false },
        data: { read: true }
      });

      return NextResponse.json({
        success: true,
        message: 'Toutes les notifications marquées comme lues'
      });
    }

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'ID notification requis' },
        { status: 400 }
      );
    }

    // Mark single notification as read
    await db.notification.update({
      where: { id: notificationId },
      data: { read: true }
    });

    return NextResponse.json({
      success: true,
      message: 'Notification marquée comme lue'
    });

  } catch (error) {
    console.error('Update notification error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Delete notification
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('notificationId');
    const userId = searchParams.get('userId');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll && userId) {
      // Delete all for user
      await db.notification.deleteMany({
        where: { userId }
      });

      return NextResponse.json({
        success: true,
        message: 'Toutes les notifications supprimées'
      });
    }

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'ID notification requis' },
        { status: 400 }
      );
    }

    await db.notification.delete({
      where: { id: notificationId }
    });

    return NextResponse.json({
      success: true,
      message: 'Notification supprimée'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
