import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import {
  loadNocPlanningSettings,
  saveNocPlanningSettings,
} from '@/lib/noc/planningSettings.server';

function normalizeRole(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, '_');
}

async function ensureAdmin(actorId: string | null | undefined) {
  const id = String(actorId ?? '').trim();
  if (!id) return null;

  const actor = await db.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  }).catch(() => null);

  if (!actor) return null;

  const role = normalizeRole(actor.role);
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'SUPERADMIN') {
    return null;
  }

  return actor;
}

export async function GET() {
  try {
    const settings = await loadNocPlanningSettings();
    return NextResponse.json({ success: true, settings });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Impossible de charger les parametres planning.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const admin = await ensureAdmin(body?.actorId);

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Action reservee aux admins.' },
        { status: 403 }
      );
    }

    const current = await loadNocPlanningSettings();
    const merged = {
      ...current,
      ...(body?.settings ?? {}),
      permissions: {
        ...current.permissions,
        ...(body?.settings?.permissions ?? {}),
      },
      visibility: {
        ...current.visibility,
        ...(body?.settings?.visibility ?? {}),
      },
      updatedAt: new Date().toISOString(),
      updatedBy: admin.id,
    };

    const saved = await saveNocPlanningSettings(merged);
    return NextResponse.json({ success: true, settings: saved });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Impossible de sauvegarder les parametres planning.' },
      { status: 500 }
    );
  }
}
