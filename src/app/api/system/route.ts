import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEFAULT_AUDIT_LOG_LIMIT = 500;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action !== 'getAuditLog') {
      return NextResponse.json(
        {
          success: false,
          error: 'Action systeme non supportee',
        },
        { status: 400 }
      );
    }

    const limitParam = Number.parseInt(searchParams.get('limit') ?? '', 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, DEFAULT_AUDIT_LOG_LIMIT)
      : DEFAULT_AUDIT_LOG_LIMIT;

    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        userId: true,
        userName: true,
        action: true,
        details: true,
        ipAddress: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        userName: log.userName,
        action: log.action,
        details: log.details ?? '',
        ipAddress: log.ipAddress ?? '',
        status: log.status ?? 'SUCCESS',
        createdAt: log.createdAt ?? new Date(0),
      })),
    });
  } catch (error) {
    console.error('System API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la recuperation des donnees systeme',
      },
      { status: 500 }
    );
  }
}
