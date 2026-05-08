import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mapTicket } from '@/lib/tickets/mapTicket';

// ── GET /api/tickets/[id] ──────────────────────────────────────

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const ticket = await (db as any).ticket.findUnique({
      where: { id },
      include: {
        attachments: true,
        comments: { orderBy: { createdAt: 'asc' } },
        history: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!ticket) return NextResponse.json({ error: 'Ticket non trouvé' }, { status: 404 });
    return NextResponse.json(mapTicket(ticket));
  } catch (err) {
    console.error('[tickets/:id GET]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ── PUT /api/tickets/[id] ──────────────────────────────────────

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const {
      status, priority, objet, description, dueDate, updatedBy,
      resolutionDescription, resolutionCause,
      // extended fields stored in tags
      ...rest
    } = body;

    // Get existing tags
    const existing = await (db as any).ticket.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Ticket non trouvé' }, { status: 404 });

    let tags: Record<string, unknown> = {};
    try { tags = JSON.parse(existing.tags ?? '{}'); } catch { /* noop */ }

    // Merge updated fields into tags
    const updatedTags = {
      ...tags,
      ...rest,
      ...(resolutionDescription !== undefined ? { resolutionDescription } : {}),
      ...(resolutionCause !== undefined ? { resolutionCause } : {}),
    };

    const updateData: Record<string, unknown> = {
      tags: JSON.stringify(updatedTags),
      updatedAt: new Date(),
    };

    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (objet !== undefined) updateData.objet = objet;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const localities = Array.isArray((updatedTags as any).localities)
      ? (updatedTags as any).localities.map((v: string) => String(v).trim()).filter(Boolean)
      : [];
    const siteNames = Array.isArray((updatedTags as any).siteNames)
      ? (updatedTags as any).siteNames.map((v: string) => String(v).trim()).filter(Boolean)
      : [];
    const technicianNames = Array.isArray((updatedTags as any).technicianNames)
      ? (updatedTags as any).technicianNames
          .map((v: { name?: string }) => v?.name?.trim())
          .filter((v: string | undefined): v is string => Boolean(v))
      : [];

    if ('localities' in rest) {
      updateData.localite = localities.length > 0 ? localities.join(', ') : null;
    }
    if ('siteNames' in rest || 'siteIds' in rest) {
      updateData.site = siteNames.length > 0 ? siteNames.join(', ') : null;
    }
    if ('technicianNames' in rest || 'technicianIds' in rest) {
      updateData.technicien = technicianNames.length > 0 ? technicianNames.join(', ') : null;
      updateData.assigneeName = technicianNames.length > 0 ? technicianNames[0] : null;
    }

    // Set closedAt on CLOSED
    if (status === 'CLOSED' && !existing.closedAt) {
      updateData.closedAt = new Date();
    }

    // History entry
    const historyEntries: Record<string, unknown>[] = [];
    if (status && status !== existing.status) {
      historyEntries.push({
        action: 'a changé le statut',
        field: 'status',
        oldValue: existing.status,
        newValue: status,
        userId: body.updatedById ?? 'system',
        userName: updatedBy ?? 'Système',
        ticketId: id,
      });
    }

    const updated = await (db as any).ticket.update({
      where: { id },
      data: updateData,
      include: { attachments: true, comments: { orderBy: { createdAt: 'asc' } }, history: true },
    });

    // Create history entries
    if (historyEntries.length > 0) {
      await Promise.all(
        historyEntries.map((h) =>
          (db as any).ticketHistory.create({ data: h }).catch(() => null)
        )
      );
    }

    return NextResponse.json(mapTicket(updated));
  } catch (err) {
    console.error('[tickets/:id PUT]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ── DELETE /api/tickets/[id] ────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { permanent, deletedBy } = body;

    if (permanent) {
      await (db as any).ticket.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    // Soft delete
    await (db as any).ticket.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: deletedBy ?? 'unknown',
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[tickets/:id DELETE]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
