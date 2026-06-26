import type { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'noc-activities-secret-key-2026';

export type JwtClaims = {
  id: string;
  email?: string;
  role?: string;
  name?: string;
  iat?: number;
  exp?: number;
};

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

export function getJwtClaims(request: NextRequest): JwtClaims | null {
  const token = getBearerToken(request);
  if (!token) return null;

  try {
    const payload = verify(token, JWT_SECRET);
    if (!payload || typeof payload !== 'object') return null;

    const id = typeof (payload as Record<string, unknown>).id === 'string'
      ? (payload as Record<string, string>).id
      : '';

    if (!id) return null;

    return {
      id,
      email: typeof (payload as Record<string, unknown>).email === 'string' ? (payload as Record<string, string>).email : undefined,
      role: typeof (payload as Record<string, unknown>).role === 'string' ? (payload as Record<string, string>).role : undefined,
      name: typeof (payload as Record<string, unknown>).name === 'string' ? (payload as Record<string, string>).name : undefined,
      iat: typeof (payload as Record<string, unknown>).iat === 'number' ? (payload as Record<string, number>).iat : undefined,
      exp: typeof (payload as Record<string, unknown>).exp === 'number' ? (payload as Record<string, number>).exp : undefined,
    };
  } catch {
    return null;
  }
}
