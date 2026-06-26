import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getJwtClaims } from '@/lib/auth/request-auth';
import { loadAllowedEmailDomains } from '@/lib/users/emailDomains';
import {
  getUserEmailDomainPolicy,
  loadUserEmailDomainPolicies,
  saveUserEmailDomainPolicies,
  UserEmailDomainPolicyMode,
} from '@/lib/users/emailDomainPolicies';

async function ensureAdmin(request: NextRequest) {
  const claims = getJwtClaims(request);
  const id = String(claims?.id ?? '').trim();
  if (!id) return null;
  const user = await db.user.findUnique({ where: { id }, select: { id: true, role: true } }).catch(() => null);
  if (!user) return null;
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') return null;
  return user;
}

async function ensureViewer(request: NextRequest, userId: string) {
  const claims = getJwtClaims(request);
  const actorId = String(claims?.id ?? '').trim();
  if (!actorId || !userId) return null;

  const actor = await db.user.findUnique({ where: { id: actorId }, select: { id: true, role: true } }).catch(() => null);
  if (!actor) return null;
  if (actor.id === userId) return actor;
  if (actor.role === 'SUPER_ADMIN' || actor.role === 'ADMIN') return actor;
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = String(searchParams.get('userId') ?? '').trim();
  const viewer = await ensureViewer(request, userId);
  if (!viewer) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
  }

  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId requis' }, { status: 400 });
  }

  const [policies, globalDomains] = await Promise.all([
    loadUserEmailDomainPolicies(),
    loadAllowedEmailDomains(),
  ]);

  return NextResponse.json({
    success: true,
    policy: getUserEmailDomainPolicy(userId, policies),
    globalDomains: globalDomains.domains,
  });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const admin = await ensureAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
    }

    const userId = String(body?.userId ?? '').trim();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId requis' }, { status: 400 });
    }

    const mode = String(body?.mode ?? 'default') as UserEmailDomainPolicyMode;
    if (mode !== 'default' && mode !== 'custom' && mode !== 'allow_any') {
      return NextResponse.json({ success: false, error: 'Mode invalide' }, { status: 400 });
    }

    const target = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!target) {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const store = await loadUserEmailDomainPolicies();
    const customDomains = Array.isArray(body?.customDomains)
      ? body.customDomains
          .map((entry: unknown) => String(entry ?? '').trim().toLowerCase().replace(/^@+/, ''))
          .filter((entry: string) => /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(entry))
      : [];

    const now = new Date().toISOString();
    const nextPolicy = {
      userId,
      mode,
      customDomains,
      updatedAt: now,
      updatedBy: admin.id,
    };

    const idx = store.policies.findIndex((entry) => entry.userId === userId);
    if (idx >= 0) {
      store.policies[idx] = nextPolicy;
    } else {
      store.policies.push(nextPolicy);
    }

    await saveUserEmailDomainPolicies(store);
    return NextResponse.json({ success: true, policy: nextPolicy });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
