import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type HealthIssue = {
  severity: 'info' | 'warning' | 'critical';
  code: string;
  message: string;
  count?: number;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('includeDetails') === 'true';

    const now = new Date();

    const [
      usersCount,
      activeUsersCount,
      shiftsCount,
      conversationsCount,
      messagesCount,
      notificationsCount,
      unreadNotificationsCount,
      expiredSessionsCount,
      usersWithoutShiftCount,
      usersByRole,
      unreadNotificationsByUser,
      shiftsWithMembers,
      conversationsWithParticipants,
      readMessagesMissingReadAtCount,
      participantsMissingReadCursorCount,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { isActive: true } }),
      db.shift.count(),
      db.conversation.count(),
      db.chatMessage.count(),
      db.notification.count(),
      db.notification.count({ where: { read: false } }),
      db.session.count({ where: { expiresAt: { lt: now } } }),
      db.user.count({ where: { shiftId: null, role: 'TECHNICIEN_NO' } }),
      db.user.groupBy({
        by: ['role'],
        _count: { _all: true },
      }),
      db.notification.groupBy({
        by: ['userId'],
        where: { read: false },
        _count: { _all: true },
      }),
      db.shift.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: { members: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      db.conversation.findMany({
        select: {
          id: true,
          title: true,
          _count: {
            select: {
              participants: true,
              messages: true,
            },
          },
        },
      }),
      db.chatMessage.count({
        where: {
          status: 'read',
          readAt: null,
        },
      }),
      db.conversationParticipant.count({
        where: {
          lastReadAt: null,
        },
      }),
    ]);

    const issues: HealthIssue[] = [];

    if (usersCount === 0) {
      issues.push({
        severity: 'critical',
        code: 'NO_USERS',
        message: 'Aucun utilisateur trouve en base.',
      });
    }

    if (shiftsCount < 3) {
      issues.push({
        severity: 'warning',
        code: 'MISSING_SHIFTS',
        message: 'Le nombre de shifts est inferieur a 3 (A, B, C attendus).',
        count: shiftsCount,
      });
    }

    if (usersWithoutShiftCount > 0) {
      issues.push({
        severity: 'warning',
        code: 'TECHNICIENS_WITHOUT_SHIFT',
        message: 'Certains techniciens NOC n ont pas de shift assigne.',
        count: usersWithoutShiftCount,
      });
    }

    if (expiredSessionsCount > 0) {
      issues.push({
        severity: 'info',
        code: 'EXPIRED_SESSIONS_PRESENT',
        message: 'Des sessions expirees existent encore en base.',
        count: expiredSessionsCount,
      });
    }

    if (readMessagesMissingReadAtCount > 0) {
      issues.push({
        severity: 'warning',
        code: 'READ_MESSAGES_WITHOUT_TIMESTAMP',
        message: 'Des messages sont marques read mais sans readAt.',
        count: readMessagesMissingReadAtCount,
      });
    }

    const underPopulatedConversations = conversationsWithParticipants.filter(
      (conversation) => conversation._count.participants < 2
    );
    if (underPopulatedConversations.length > 0) {
      issues.push({
        severity: 'warning',
        code: 'UNDERPOPULATED_CONVERSATIONS',
        message: 'Certaines conversations ont moins de 2 participants.',
        count: underPopulatedConversations.length,
      });
    }

    const status = issues.some((issue) => issue.severity === 'critical')
      ? 'critical'
      : issues.some((issue) => issue.severity === 'warning')
      ? 'warning'
      : 'healthy';

    return NextResponse.json({
      success: true,
      status,
      generatedAt: now,
      summary: {
        users: usersCount,
        activeUsers: activeUsersCount,
        shifts: shiftsCount,
        conversations: conversationsCount,
        messages: messagesCount,
        notifications: notificationsCount,
        unreadNotifications: unreadNotificationsCount,
      },
      issues,
      details: includeDetails
        ? {
            usersByRole: usersByRole.map((entry) => ({
              role: entry.role || 'UNKNOWN',
              count: entry._count._all,
            })),
            unreadNotificationsByUser: unreadNotificationsByUser.map((entry) => ({
              userId: entry.userId,
              unread: entry._count._all,
            })),
            shiftsWithMembers: shiftsWithMembers.map((shift) => ({
              shiftId: shift.id,
              shiftName: shift.name,
              members: shift._count.members,
            })),
            conversations: conversationsWithParticipants.map((conversation) => ({
              conversationId: conversation.id,
              title: conversation.title || 'Conversation',
              participants: conversation._count.participants,
              messages: conversation._count.messages,
            })),
            participantsMissingReadCursor: participantsMissingReadCursorCount,
          }
        : undefined,
    });
  } catch (error) {
    console.error('Data health check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors du controle de la sante des donnees',
      },
      { status: 500 }
    );
  }
}
