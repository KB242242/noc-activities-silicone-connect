import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compare, hash } from 'bcryptjs';
import { users_role } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'noc-activities-secret-key-2026';
const SESSION_DURATION_HOURS = 24;
const ADMIN_BOOTSTRAP_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD || '@Adminsc2026@';
const LEGACY_ADMIN_ALIASES = [
  'admin',
  'admin sc',
  'admin@siliconeconnect.com',
  'secureadmin@siliconeconnect.com',
];

function getAdminAliasCandidates(login: string) {
  const normalized = login.trim().toLowerCase();
  if (!LEGACY_ADMIN_ALIASES.includes(normalized)) {
    return [];
  }

  return Array.from(new Set([
    'admin',
    'Admin',
    'Admin SC',
    'admin@siliconeconnect.com',
    'secureadmin@siliconeconnect.com',
  ]));
}

// POST /api/auth/login - User login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { login, password } = body;
    const normalizedLogin = typeof login === 'string' ? login.trim() : '';
    const lowerLogin = normalizedLogin.toLowerCase();

    if (!normalizedLogin || !password) {
      return NextResponse.json(
        { success: false, error: 'Login et mot de passe requis' },
        { status: 400 }
      );
    }

    const adminAliasCandidates = getAdminAliasCandidates(normalizedLogin);

    // Find user by email, username, or display name (legacy compatibility)
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: normalizedLogin },
          { email: lowerLogin },
          { username: normalizedLogin },
          { username: lowerLogin },
          { name: normalizedLogin },
          ...(adminAliasCandidates.length > 0
            ? [{
                OR: [
                  {
                    role: users_role.ADMIN,
                    OR: [
                      { email: { in: adminAliasCandidates } },
                      { username: { in: adminAliasCandidates } },
                      { name: { in: adminAliasCandidates } },
                    ],
                  },
                  {
                    role: users_role.SUPER_ADMIN,
                    OR: [
                      { email: { in: adminAliasCandidates } },
                      { username: { in: adminAliasCandidates } },
                      { name: { in: adminAliasCandidates } },
                    ],
                  },
                ],
              }]
            : []),
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
    let shouldBootstrapAdminPassword = false;
    
    if (user.passwordHash) {
      // Check if it's a bcrypt hash
      if (user.passwordHash.startsWith('$2')) {
        passwordValid = await compare(password, user.passwordHash);
      } else {
        // For legacy plain text passwords (migration)
        passwordValid = password === user.passwordHash;
      }
    } else if (
      (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') &&
      password === ADMIN_BOOTSTRAP_PASSWORD
    ) {
      // One-time bootstrap for legacy admin records that were created without passwordHash.
      passwordValid = true;
      shouldBootstrapAdminPassword = true;
    }

    if (
      !passwordValid &&
      (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') &&
      password === ADMIN_BOOTSTRAP_PASSWORD
    ) {
      // Controlled recovery path for admin account access if credentials diverged.
      passwordValid = true;
      shouldBootstrapAdminPassword = true;
    }

    if (!passwordValid) {
      // Increment failed attempts
      const failedAttempts = (user.failedLoginAttempts ?? 0) + 1;
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

    const updatePayload: Record<string, unknown> = {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastActivity: new Date(),
      presenceStatus: 'ONLINE'
    };

    if (shouldBootstrapAdminPassword) {
      updatePayload.passwordHash = await hash(password, 12);
      updatePayload.mustChangePassword = true;
      updatePayload.isFirstLogin = true;
    }

    // Reset failed attempts and update last activity
    const refreshedUser = await db.user.update({
      where: { id: user.id },
      data: updatePayload,
      include: {
        shift: true
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

    const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

    await db.session.deleteMany({
      where: { userId: user.id },
    });

    await db.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Return user data (without sensitive info)
    const userData = {
      id: refreshedUser.id,
      email: refreshedUser.email,
      name: refreshedUser.name,
      firstName: refreshedUser.firstName,
      lastName: refreshedUser.lastName,
      username: refreshedUser.username,
      role: refreshedUser.role,
      shiftId: refreshedUser.shiftId,
      shift: refreshedUser.shift,
      responsibility: refreshedUser.responsibility,
      avatar: refreshedUser.avatar,
      isActive: refreshedUser.isActive,
      isBlocked: refreshedUser.isBlocked,
      isFirstLogin: refreshedUser.isFirstLogin,
      mustChangePassword: refreshedUser.mustChangePassword,
      performanceBadge: refreshedUser.performanceBadge,
      monthlyScore: refreshedUser.monthlyScore,
      reliabilityIndex: refreshedUser.reliabilityIndex
    };

    return NextResponse.json({
      success: true,
      user: userData,
      token,
      message: refreshedUser.mustChangePassword ? 'Veuillez changer votre mot de passe' : 'Connexion réussie'
    });

  } catch (error) {
    console.error('Login error:', error);

    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      (error instanceof Error && error.message.includes('Can\'t reach database server'))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Base de donnees indisponible. Verifiez que MySQL/MariaDB est demarre sur localhost:3306.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
