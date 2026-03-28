import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash, compare } from 'bcryptjs';

// POST /api/auth/change-password - Change user password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, currentPassword, newPassword } = body;

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Le mot de passe ne respecte pas les critères de sécurité',
          validation: passwordValidation
        },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Verify current password
    let passwordValid = false;
    if (user.passwordHash) {
      if (user.passwordHash.startsWith('$2')) {
        passwordValid = await compare(currentPassword, user.passwordHash);
      } else {
        // Legacy plain text
        passwordValid = currentPassword === user.passwordHash;
      }
    }

    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: 'Mot de passe actuel incorrect' },
        { status: 401 }
      );
    }

    // Hash new password
    const hashedPassword = await hash(newPassword, 12);

    // Update user
    await db.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
        mustChangePassword: false,
        isFirstLogin: false,
        updatedAt: new Date()
      }
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        action: 'PASSWORD_CHANGED',
        details: 'Mot de passe modifié avec succès',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        status: 'SUCCESS'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PUT /api/auth/change-password - Admin reset user password
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminId, targetUserId, newPassword } = body;

    if (!adminId || !targetUserId || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    // Verify admin is SUPER_ADMIN
    const admin = await db.user.findUnique({ where: { id: adminId } });
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 403 }
      );
    }

    // Find target user
    const targetUser = await db.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await hash(newPassword, 12);

    // Update user
    await db.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash: hashedPassword,
        mustChangePassword: true,
        updatedAt: new Date()
      }
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: admin.id,
        userName: admin.name,
        action: 'PASSWORD_RESET',
        details: `Mot de passe réinitialisé pour ${targetUser.name} (${targetUser.email})`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        status: 'SUCCESS'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

function validatePassword(password: string) {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password);
  
  const score = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
  const strength: 'weak' | 'medium' | 'strong' = score <= 2 ? 'weak' : score === 3 ? 'medium' : 'strong';
  
  return {
    isValid: hasMinLength && hasUppercase && hasNumber && hasSpecial,
    hasMinLength,
    hasUppercase,
    hasNumber,
    hasSpecial,
    strength
  };
}
