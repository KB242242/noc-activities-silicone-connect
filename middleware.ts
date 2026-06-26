import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'noc-activities-secret-key-2026';

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

async function hasValidJwt(request: NextRequest): Promise<boolean> {
  const token = getBearerToken(request);
  if (!token) return false;

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return typeof payload?.id === 'string' && payload.id.length > 0;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  // Laisser passer les preflight CORS (utile si des integrations externes sont ajoutees)
  if (request.method === 'OPTIONS') {
    return NextResponse.next();
  }

  const isAuthenticated = await hasValidJwt(request);
  if (!isAuthenticated) {
    return NextResponse.json({ success: false, error: 'Non authentifie' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/users/:path*',
    '/api/system/smtp-settings/:path*',
  ],
};
