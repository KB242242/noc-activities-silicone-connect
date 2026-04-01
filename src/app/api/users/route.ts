import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

// GET /api/users - Get all users (with filters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const shiftId = searchParams.get('shiftId');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    const where: any = {};

    if (role) {
      where.role = role;
    }
    if (shiftId) {
      where.shiftId = shiftId;
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { username: { contains: search } }
      ];
    }

    const users = await db.user.findMany({
      where,
      include: {
        shift: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Remove sensitive data
    const safeUsers = users.map(user => ({
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
      reliabilityIndex: user.reliabilityIndex,
      lastActivity: user.lastActivity,
      presenceStatus: user.presenceStatus,
      createdAt: user.createdAt
    }));

    return NextResponse.json({
      success: true,
      users: safeUsers,
      count: safeUsers.length
    });

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user (Super Admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      adminId,
      email, 
      name, 
      firstName, 
      lastName, 
      username, 
      password, 
      role, 
      shiftId, 
      responsibility 
    } = body;

    // Verify admin permissions
    const admin = await db.user.findUnique({ where: { id: adminId } });
    if (!admin || (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!email || !name || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'Email, nom, mot de passe et rôle sont requis' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Un utilisateur avec cet email existe déjà' },
        { status: 400 }
      );
    }

    // Check username uniqueness if provided
    if (username) {
      const existingUsername = await db.user.findUnique({ where: { username } });
      if (existingUsername) {
        return NextResponse.json(
          { success: false, error: 'Ce nom d\'utilisateur est déjà pris' },
          { status: 400 }
        );
      }
    }

    // Validate password
    const passwordValidation = validatePassword(password);
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

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user
    const user = await db.user.create({
      data: {
        email,
        name,
        firstName: firstName || null,
        lastName: lastName || null,
        username: username || null,
        passwordHash: hashedPassword,
        role,
        shiftId: shiftId || null,
        responsibility: responsibility || null,
        isActive: true,
        isBlocked: false,
        isFirstLogin: true,
        mustChangePassword: true
      },
      include: {
        shift: true
      }
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: admin.id,
        userName: admin.name,
        action: 'USER_CREATED',
        details: `Utilisateur créé: ${user.name} (${user.email}) - Rôle: ${user.role}`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        status: 'SUCCESS'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Utilisateur créé avec succès',
      user: {
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
        isActive: user.isActive,
        isFirstLogin: user.isFirstLogin,
        mustChangePassword: user.mustChangePassword
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PUT /api/users - Update user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      adminId,
      userId,
      name, 
      firstName, 
      lastName, 
      username, 
      role, 
      shiftId, 
      responsibility,
      isActive,
      isBlocked
    } = body;

    // Verify admin permissions
    const admin = await db.user.findUnique({ where: { id: adminId } });
    if (!admin || (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 403 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ID utilisateur requis' },
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

    // Check username uniqueness if changing
    if (username && username !== user.username) {
      const existingUsername = await db.user.findUnique({ where: { username } });
      if (existingUsername) {
        return NextResponse.json(
          { success: false, error: 'Ce nom d\'utilisateur est déjà pris' },
          { status: 400 }
        );
      }
    }

    // Only SUPER_ADMIN can change roles to SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Seul un Super Admin peut attribuer le rôle Super Admin' },
        { status: 403 }
      );
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        name: name || user.name,
        firstName: firstName !== undefined ? firstName : user.firstName,
        lastName: lastName !== undefined ? lastName : user.lastName,
        username: username !== undefined ? username : user.username,
        role: role || user.role,
        shiftId: shiftId !== undefined ? shiftId : user.shiftId,
        responsibility: responsibility !== undefined ? responsibility : user.responsibility,
        isActive: isActive !== undefined ? isActive : user.isActive,
        isBlocked: isBlocked !== undefined ? isBlocked : user.isBlocked,
        updatedAt: new Date()
      },
      include: {
        shift: true
      }
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: admin.id,
        userName: admin.name,
        action: 'USER_UPDATED',
        details: `Utilisateur modifié: ${updatedUser.name} (${updatedUser.email})`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        status: 'SUCCESS'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Utilisateur modifié avec succès',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        username: updatedUser.username,
        role: updatedUser.role,
        shiftId: updatedUser.shiftId,
        shift: updatedUser.shift,
        responsibility: updatedUser.responsibility,
        isActive: updatedUser.isActive,
        isBlocked: updatedUser.isBlocked
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE /api/users - Delete/Deactivate user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');
    const userId = searchParams.get('userId');
    const permanent = searchParams.get('permanent') === 'true';

    // Verify admin permissions
    const admin = await db.user.findUnique({ where: { id: adminId || '' } });
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 403 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ID utilisateur requis' },
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

    // Prevent self-deletion
    if (user.id === admin.id) {
      return NextResponse.json(
        { success: false, error: 'Vous ne pouvez pas supprimer votre propre compte' },
        { status: 400 }
      );
    }

    if (permanent) {
      // Permanent delete
      await db.user.delete({ where: { id: userId } });
    } else {
      // Soft delete - deactivate
      await db.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: admin.id,
        userName: admin.name,
        action: permanent ? 'USER_DELETED' : 'USER_DEACTIVATED',
        details: `${permanent ? 'Suppression' : 'Désactivation'} du compte: ${user.name} (${user.email})`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        status: 'SUCCESS'
      }
    });

    return NextResponse.json({
      success: true,
      message: permanent ? 'Utilisateur supprimé définitivement' : 'Utilisateur désactivé'
    });

  } catch (error) {
    console.error('Delete user error:', error);
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
