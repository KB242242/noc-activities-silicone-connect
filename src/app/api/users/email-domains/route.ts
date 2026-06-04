import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  defaultEmailDomain,
  loadAllowedEmailDomains,
  saveAllowedEmailDomains,
} from '@/lib/users/emailDomains';

async function ensureAdmin(adminId: string | null | undefined) {
  const id = String(adminId ?? '').trim();
  if (!id) return null;
  const user = await db.user.findUnique({ where: { id }, select: { id: true, role: true } }).catch(() => null);
  if (!user) return null;
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') return null;
  return user;
}

export async function GET() {
  const store = await loadAllowedEmailDomains();
  return NextResponse.json({
    success: true,
    domains: store.domains,
    defaultDomain: defaultEmailDomain(store.domains)?.domain ?? null,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const admin = await ensureAdmin(body?.adminId);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
    }

    const rawDomain = String(body?.domain ?? '').trim().toLowerCase().replace(/^@+/, '');
    if (!rawDomain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(rawDomain)) {
      return NextResponse.json({ success: false, error: 'Domaine email invalide' }, { status: 400 });
    }

    const store = await loadAllowedEmailDomains();
    if (store.domains.some((entry) => entry.domain === rawDomain)) {
      return NextResponse.json({ success: false, error: 'Ce domaine existe déjà' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const newDomain = {
      id: rawDomain,
      domain: rawDomain,
      isActive: body?.isDefault === true ? true : body?.isActive !== false,
      isDefault: body?.isDefault === true,
      createdAt: now,
      updatedAt: now,
    };

    const nextDomains = [...store.domains, newDomain].map((entry) => ({ ...entry }));
    if (newDomain.isDefault) {
      for (const entry of nextDomains) {
        entry.isDefault = entry.domain === newDomain.domain;
      }
    }

    await saveAllowedEmailDomains({ domains: nextDomains });
    const reloaded = await loadAllowedEmailDomains();
    return NextResponse.json({ success: true, domains: reloaded.domains });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const admin = await ensureAdmin(body?.adminId);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
    }

    const domain = String(body?.domain ?? '').trim().toLowerCase().replace(/^@+/, '');
    if (!domain) {
      return NextResponse.json({ success: false, error: 'Domaine requis' }, { status: 400 });
    }

    const store = await loadAllowedEmailDomains();
    const target = store.domains.find((entry) => entry.domain === domain);
    if (!target) {
      return NextResponse.json({ success: false, error: 'Domaine introuvable' }, { status: 404 });
    }

    if (body?.isActive !== undefined) {
      target.isActive = Boolean(body.isActive);
    }
    if (body?.isDefault === true) {
      for (const entry of store.domains) {
        entry.isDefault = entry.domain === domain;
        if (entry.isDefault) entry.isActive = true;
      }
    }

    target.updatedAt = new Date().toISOString();
    await saveAllowedEmailDomains(store);
    const reloaded = await loadAllowedEmailDomains();
    return NextResponse.json({ success: true, domains: reloaded.domains });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = String(searchParams.get('domain') ?? '').trim().toLowerCase().replace(/^@+/, '');
    const adminId = searchParams.get('adminId');
    const admin = await ensureAdmin(adminId);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
    }

    if (!domain) {
      return NextResponse.json({ success: false, error: 'Domaine requis' }, { status: 400 });
    }

    const store = await loadAllowedEmailDomains();
    const nextDomains = store.domains.filter((entry) => entry.domain !== domain);
    if (nextDomains.length === store.domains.length) {
      return NextResponse.json({ success: false, error: 'Domaine introuvable' }, { status: 404 });
    }
    if (nextDomains.length === 0) {
      return NextResponse.json({ success: false, error: 'Au moins un domaine doit rester configuré' }, { status: 400 });
    }

    if (!nextDomains.some((entry) => entry.isDefault && entry.isActive)) {
      const firstActive = nextDomains.find((entry) => entry.isActive) ?? nextDomains[0];
      for (const entry of nextDomains) {
        entry.isDefault = entry.domain === firstActive.domain;
      }
      firstActive.isActive = true;
    }

    await saveAllowedEmailDomains({ domains: nextDomains });
    const reloaded = await loadAllowedEmailDomains();
    return NextResponse.json({ success: true, domains: reloaded.domains });
  } catch {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
