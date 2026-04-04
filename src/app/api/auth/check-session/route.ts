import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token =
      request.headers.get('Authorization')?.replace('Bearer ', '') ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Token manquant' 
      }, { status: 401 });
    }

    const session = await db.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            shift: true,
          },
        },
      },
    });

    if (!session || (session.expiresAt && session.expiresAt < new Date())) {
      if (session) {
        await db.session.delete({ where: { id: session.id } });
      }
      return NextResponse.json({ 
        valid: false, 
        error: 'Session expirée ou invalide' 
      }, { status: 401 });
    }

    await db.session.update({
      where: { id: session.id },
      data: {
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await db.user.update({
      where: { id: session.userId },
      data: {
        lastActivity: new Date(),
      },
    });

    return NextResponse.json({
      valid: true,
      user: session.user
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ 
      valid: false, 
      error: 'Erreur serveur' 
    }, { status: 500 });
  }
}
