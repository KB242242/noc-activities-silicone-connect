import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loadNocClientSettings, saveNocClientSettings } from '@/lib/noc/clientSettings';

function normalizeRole(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, '_');
}

async function ensureAdmin(actorId: string | null | undefined) {
  const id = String(actorId ?? '').trim();
  if (!id) return null;
  const actor = await db.user.findUnique({ where: { id }, select: { id: true, role: true } }).catch(() => null);
  if (!actor) return null;
  const role = normalizeRole(actor.role);
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'SUPERADMIN') return null;
  return actor;
}

export async function GET() {
  try {
    const settings = await loadNocClientSettings();
    return NextResponse.json({ success: true, settings });
  } catch {
    return NextResponse.json({ success: false, error: 'Impossible de charger les parametres clients.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const admin = await ensureAdmin(body?.actorId);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Action reservee aux admins.' }, { status: 403 });
    }

    const current = await loadNocClientSettings();
    const merged = {
      ...current,
      ...body?.settings,
      idStyle: {
        ...current.idStyle,
        ...(body?.settings?.idStyle ?? {}),
      },
      permissions: {
        ...current.permissions,
        ...(body?.settings?.permissions ?? {}),
      },
      api: {
        ...current.api,
        ...(body?.settings?.api ?? {}),
      },
      ui: {
        ...current.ui,
        ...(body?.settings?.ui ?? {}),
      },
      updatedAt: new Date().toISOString(),
      updatedBy: admin.id,
    };

    const saved = await saveNocClientSettings(merged);
    return NextResponse.json({ success: true, settings: saved });
  } catch {
    return NextResponse.json({ success: false, error: 'Impossible de sauvegarder les parametres clients.' }, { status: 500 });
  }
}
