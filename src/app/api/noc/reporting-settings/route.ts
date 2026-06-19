import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import {
  loadNocReportingSettings,
  saveNocReportingSettings,
} from '@/lib/noc/reportingSettings';

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
    const settings = await loadNocReportingSettings();
    return NextResponse.json({ success: true, settings });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Impossible de charger les paramètres reporting.' },
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
        { success: false, error: 'Action réservée aux admins.' },
        { status: 403 }
      );
    }

    const current = await loadNocReportingSettings();
    const merged = {
      ...current,
      ...(body?.settings ?? {}),
      daily: {
        ...current.daily,
        ...(body?.settings?.daily ?? {}),
      },
      night: {
        ...current.night,
        ...(body?.settings?.night ?? {}),
      },
      updatedAt: new Date().toISOString(),
      updatedBy: admin.id,
    };

    const saved = await saveNocReportingSettings(merged);
    return NextResponse.json({ success: true, settings: saved });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Impossible de sauvegarder les paramètres reporting.' },
      { status: 500 }
    );
  }
}
