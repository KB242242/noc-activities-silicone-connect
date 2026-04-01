import { NextRequest, NextResponse } from 'next/server';
import { checkSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Token manquant' 
      }, { status: 401 });
    }

    const sessionResult = await checkSession(token);

    if (!sessionResult.valid) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Session expirée ou invalide' 
      }, { status: 401 });
    }

    return NextResponse.json({
      valid: true,
      user: sessionResult.user
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ 
      valid: false, 
      error: 'Erreur serveur' 
    }, { status: 500 });
  }
}
