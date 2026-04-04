import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/auth/logout - User logout
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      await db.session.deleteMany({
        where: { token },
      });
    }
    
    // Get user ID from request body if available
    let userId = null;
    try {
      const body = await request.clone().json();
      userId = body.userId;
    } catch {
      // No body, continue without userId
    }

    if (userId) {
      // Update user presence status
      await db.user.update({
        where: { id: userId },
        data: {
          presenceStatus: 'OFFLINE',
          lastActivity: new Date()
        }
      });

      // Create audit log
      const user = await db.user.findUnique({ where: { id: userId } });
      if (user) {
        await db.auditLog.create({
          data: {
            userId: user.id,
            userName: user.name,
            action: 'LOGOUT',
            details: 'Déconnexion réussie',
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            status: 'SUCCESS'
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
