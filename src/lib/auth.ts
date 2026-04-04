import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Secret key for JWT (should be in environment variables)
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'silicone-connect-secret-key-2026-secure'
);

// Session timeout: 10 minutes
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

// Password validation rules
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' = 'weak';

  if (password.length < 8) {
    errors.push('Minimum 8 caractères requis');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Au moins 1 majuscule requise');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Au moins 1 chiffre requis');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Au moins 1 caractère spécial requis (!@#$%^&*...)');
  }

  // Calculate strength
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const score = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  
  if (score === 5) strength = 'strong';
  else if (score >= 3) strength = 'medium';
  else strength = 'weak';

  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export async function generateToken(userId: string): Promise<string> {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m') // 10 minutes
    .sign(JWT_SECRET);
  
  return token;
}

// Verify JWT token
export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string };
  } catch {
    return null;
  }
}

// Create session in database
export async function createSession(userId: string): Promise<string> {
  const token = await generateToken(userId);
  const expiresAt = new Date(Date.now() + SESSION_TIMEOUT);
  
  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt
    }
  });
  
  return token;
}

// Check and refresh session
export async function checkSession(token: string): Promise<{
  valid: boolean;
  userId?: string;
  user?: any;
}> {
  try {
    // Verify JWT
    const payload = await verifyToken(token);
    if (!payload) {
      return { valid: false };
    }

    // Check session in database
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            shift: {
              select: {
                id: true,
                name: true,
                color: true,
                colorCode: true
              }
            }
          }
        }
      }
    });

    if (!session || !session.expiresAt || session.expiresAt < new Date()) {
      // Session expired or not found
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      return { valid: false };
    }

    // Refresh session (extend timeout)
    const newExpiresAt = new Date(Date.now() + SESSION_TIMEOUT);
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiresAt }
    });

    // Update last activity
    await prisma.user.update({
      where: { id: session.userId },
      data: { lastActivity: new Date() }
    });

    return {
      valid: true,
      userId: session.userId,
      user: session.user
    };
  } catch (error) {
    console.error('Session check error:', error);
    return { valid: false };
  }
}

// Invalidate session (logout)
export async function invalidateSession(token: string): Promise<void> {
  try {
    await prisma.session.deleteMany({
      where: { token }
    });
  } catch (error) {
    console.error('Session invalidation error:', error);
  }
}

// Clean expired sessions
export async function cleanExpiredSessions(): Promise<void> {
  try {
    await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
}

// Record audit log
export async function recordAuditLog(
  userId: string | null,
  action: string,
  details: string | null,
  ipAddress: string | null,
  status: 'SUCCESS' | 'FAILURE' | 'WARNING'
): Promise<void> {
  try {
    const data = {
      userName: userId ?? 'SYSTEM',
      action,
      details,
      ipAddress,
      status,
      ...(userId ? { user: { connect: { id: userId } } } : {}),
    };

    await prisma.auditLog.create({
      data: data as any
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

// Get client IP from request
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

// Check if user is SUPER_ADMIN
export function isSuperAdmin(role: string): boolean {
  return role === 'SUPER_ADMIN';
}

// Check if user can manage users
export function canManageUsers(role: string): boolean {
  return ['SUPER_ADMIN', 'ADMIN'].includes(role);
}

// Default password for new users
export const DEFAULT_PASSWORD = 'SiliconeConnect@2026';
