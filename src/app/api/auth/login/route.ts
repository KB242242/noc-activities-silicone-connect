import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'noc-activities-secret-key-2026';

// POST /api/auth/login - User login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { login, password } = body;

    if (!login || !password) {
      return NextResponse.json(
        { success: false, error: 'Login et mot de passe requis' },
        { status: 400 }
      );
    }

    // Find user by email or username
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: login },
          { username: login }
        ]
      },
      include: {
        shift: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 401 }
      );
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return NextResponse.json(
        { success: false, error: 'Compte bloqué. Contactez l\'administrateur' },
        { status: 403 }
      );
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { success: false, error: `Compte verrouillé. Réessayez dans ${remainingMinutes} minutes` },
        { status: 403 }
      );
    }

    // Verify password
    let passwordValid = false;
    
    if (user.passwordHash) {
      // Check if it's a bcrypt hash
      if (user.passwordHash.startsWith('$2')) {
        passwordValid = await compare(password, user.passwordHash);
      } else {
        // For legacy plain text passwords (migration)
        passwordValid = password === user.passwordHash;
      }
    }

    if (!passwordValid) {
      // Increment failed attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      let lockedUntil = user.lockedUntil;
      
      // Lock account after 5 failed attempts for 30 minutes
      if (failedAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }

      await db.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil
        }
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: user.id,
          userName: user.name,
          action: 'LOGIN_FAILED',
          details: `Tentative de connexion échouée (${failedAttempts} tentatives)`,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          status: 'FAILURE'
        }
      });

      return NextResponse.json(
        { success: false, error: 'Mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Compte désactivé. Contactez l\'administrateur' },
        { status: 403 }
      );
    }

    // Reset failed attempts and update last activity
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastActivity: new Date(),
        presenceStatus: 'ONLINE'
      }
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        action: 'LOGIN_SUCCESS',
        details: 'Connexion réussie',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        status: 'SUCCESS'
      }
    });

    // Generate JWT token
    const token = sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data (without sensitive info)
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      role: user.role,
      shiftId: user.shiftId,
      shift: user.shift,
      responsibility: user.responsibility,
      avatar: user.avatar,
      isActive: user.isActive,
      isBlocked: user.isBlocked,
      isFirstLogin: user.isFirstLogin,
      mustChangePassword: user.mustChangePassword,
      performanceBadge: user.performanceBadge,
      monthlyScore: user.monthlyScore,
      reliabilityIndex: user.reliabilityIndex
    };

    return NextResponse.json({
      success: true,
      user: userData,
      token,
      message: user.mustChangePassword ? 'Veuillez changer votre mot de passe' : 'Connexion réussie'
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
