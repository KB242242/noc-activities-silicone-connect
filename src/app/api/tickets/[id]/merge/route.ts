import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mapTicket } from '@/lib/tickets/mapTicket';
import { resolveTicketManagerFromActorId } from '@/lib/tickets/permissions';

function parseTags(raw?: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function stringifyTags(value: Record<string, unknown>) {
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
}

function normalizeTicketRef(value: unknown) {
  return String(value ?? '').trim().replace(/^#/, '');
}

function splitCsv(value: unknown): string[] {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeUniqueStrings(...inputs: Array<unknown>) {
  const merged = inputs.flatMap((value) => Array.isArray(value) ? value : splitCsv(value));
  return Array.from(new Set(merged.map((item) => String(item).trim()).filter(Boolean)));
}

async function resolveTicketByRef(ref: string) {
  const normalized = normalizeTicketRef(ref);
  if (!normalized) return null;
  const hashRef = `#${normalized}`;

  return (db as any).ticket.findFirst({
    where: {
      OR: [
        { id: normalized },
        { numero: normalized },
        { numero: hashRef },
      ],
    },
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const ticketRefs = Array.isArray(body.ticketRefs)
      ? body.ticketRefs.map((value: unknown) => normalizeTicketRef(value)).filter(Boolean)
      : [];
    const mode = String(body.mode ?? 'group').toLowerCase() === 'merge' ? 'merge' : 'group';
    const userId = String(body.userId ?? 'system').trim() || 'system';
    const userName = String(body.userName ?? 'Systeme').trim() || 'Systeme';

    const actorAccess = await resolveTicketManagerFromActorId(db, userId);
    if (!actorAccess.canManage) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    if (ticketRefs.length === 0) {
      return NextResponse.json({ error: 'Aucun ticket a fusionner' }, { status: 400 });
    }

    const parent = await (db as any).ticket.findUnique({ where: { id } });
    if (!parent) {
      return NextResponse.json({ error: 'Ticket parent introuvable' }, { status: 404 });
    }

    const parentTags = parseTags(parent.tags);
    const resolvedChildren: any[] = [];

    for (const ref of ticketRefs) {
      const resolved = await resolveTicketByRef(ref);
      if (!resolved) continue;
      if (String(resolved.id) === String(parent.id)) continue;
      if (!resolvedChildren.some((item) => String(item.id) === String(resolved.id))) {
        resolvedChildren.push(resolved);
      }
    }

    if (resolvedChildren.length === 0) {
      return NextResponse.json({ error: 'Aucun ticket valide a fusionner' }, { status: 404 });
    }

    const mergedTicketIds = Array.from(new Set([
      ...(Array.isArray(parentTags.mergedTicketIds) ? parentTags.mergedTicketIds.map((v) => String(v)) : []),
      ...resolvedChildren.map((ticket) => String(ticket.id)),
    ]));

    const mergedTicketNumeros = Array.from(new Set([
      ...(Array.isArray(parentTags.mergedTicketNumeros) ? parentTags.mergedTicketNumeros.map((v) => String(v)) : []),
      ...resolvedChildren.map((ticket) => String(ticket.numero ?? ticket.id)),
    ]));

    const parentUpdateData: Record<string, unknown> = {
      updatedAt: new Date(),
      tags: stringifyTags({
        ...parentTags,
        mergedTicketIds,
        mergedTicketNumeros,
        mergedMode: mode,
        mergeUpdatedAt: new Date().toISOString(),
      }),
    };

    if (mode === 'merge') {
      const mergedTechniciens = mergeUniqueStrings(
        parent.technicien,
        ...resolvedChildren.map((ticket) => ticket.technicien)
      );
      const mergedSites = mergeUniqueStrings(
        parent.site,
        ...resolvedChildren.map((ticket) => ticket.site)
      );
      const mergedLocalities = mergeUniqueStrings(
        parent.localite,
        ...resolvedChildren.map((ticket) => ticket.localite)
      );

      const descriptionBlocks = [String(parent.description ?? '').trim()]
        .concat(
          resolvedChildren.map((ticket) => {
            const childDescription = String(ticket.description ?? '').trim();
            if (!childDescription) return '';
            return `[Fusion ${String(ticket.numero ?? ticket.id)}]\n${childDescription}`;
          })
        )
        .filter(Boolean);

      parentUpdateData.technicien = mergedTechniciens.join(', ') || null;
      parentUpdateData.site = mergedSites.join(', ') || null;
      parentUpdateData.localite = mergedLocalities.join(', ') || null;
      parentUpdateData.description = descriptionBlocks.join('\n\n');

      for (const child of resolvedChildren) {
        const childComments = await (db as any).ticketComment.findMany({
          where: { ticketId: String(child.id) },
          orderBy: { createdAt: 'asc' },
        });

        for (const comment of childComments) {
          const mergedContent = `🔗 Fusion depuis ${String(child.numero ?? child.id)}\n${String(comment.content ?? '').trim()}`.trim();
          if (!mergedContent) continue;

          await (db as any).ticketComment.create({
            data: {
              ticketId: String(parent.id),
              userId: String(comment.userId ?? userId),
              userName: String(comment.userName ?? userName),
              content: mergedContent,
              isPrivate: Boolean(comment.isPrivate ?? false),
            },
          }).catch(() => null);
        }
      }
    }

    await (db as any).ticket.update({
      where: { id: String(parent.id) },
      data: parentUpdateData,
    });

    for (const child of resolvedChildren) {
      const childTags = parseTags(child.tags);
      const childNextTags: Record<string, unknown> = {
        ...childTags,
        mergedParentTicketId: String(parent.id),
        mergedParentTicketNumero: String(parent.numero ?? parent.id),
        mergedMode: mode,
      };

      await (db as any).ticket.update({
        where: { id: String(child.id) },
        data: {
          tags: stringifyTags(childNextTags),
          updatedAt: new Date(),
        },
      }).catch(() => null);

      await (db as any).ticketHistory.create({
        data: {
          ticketId: String(child.id),
          userId,
          userName,
          action: mode === 'merge' ? 'ticket_merged_into_parent' : 'ticket_grouped_into_parent',
          field: 'merge',
          oldValue: null,
          newValue: JSON.stringify({
            parentTicketId: String(parent.id),
            parentTicketNumero: String(parent.numero ?? parent.id),
          }),
          timestamp: new Date(),
        },
      }).catch(() => null);
    }

    await (db as any).ticketHistory.create({
      data: {
        ticketId: String(parent.id),
        userId,
        userName,
        action: mode === 'merge' ? 'tickets_merged' : 'tickets_grouped',
        field: 'merge',
        oldValue: null,
        newValue: JSON.stringify({
          ticketIds: resolvedChildren.map((ticket) => String(ticket.id)),
          ticketNumeros: resolvedChildren.map((ticket) => String(ticket.numero ?? ticket.id)),
          mode,
        }),
        timestamp: new Date(),
      },
    }).catch(() => null);

    const updatedParent = await (db as any).ticket.findUnique({
      where: { id: String(parent.id) },
      include: {
        attachments: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        history: { orderBy: { timestamp: 'desc' }, take: 50 },
      },
    });

    return NextResponse.json(mapTicket(updatedParent ?? parent));
  } catch (err) {
    console.error('[tickets/:id/merge POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const ticketRef = normalizeTicketRef(body.ticketRef);
    const userId = String(body.userId ?? 'system').trim() || 'system';
    const userName = String(body.userName ?? 'Systeme').trim() || 'Systeme';

    const actorAccess = await resolveTicketManagerFromActorId(db, userId);
    if (!actorAccess.canManage) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    if (!ticketRef) {
      return NextResponse.json({ error: 'Ticket a dissocier requis' }, { status: 400 });
    }

    const parent = await (db as any).ticket.findUnique({ where: { id } });
    if (!parent) {
      return NextResponse.json({ error: 'Ticket parent introuvable' }, { status: 404 });
    }

    const child = await resolveTicketByRef(ticketRef);
    if (!child) {
      return NextResponse.json({ error: 'Ticket a dissocier introuvable' }, { status: 404 });
    }

    const parentTags = parseTags(parent.tags);
    const nextMergedIds = (Array.isArray(parentTags.mergedTicketIds) ? parentTags.mergedTicketIds : [])
      .map((value) => String(value))
      .filter((value) => value !== String(child.id));
    const nextMergedNumeros = (Array.isArray(parentTags.mergedTicketNumeros) ? parentTags.mergedTicketNumeros : [])
      .map((value) => String(value))
      .filter((value) => normalizeTicketRef(value) !== normalizeTicketRef(child.numero));

    await (db as any).ticket.update({
      where: { id: String(parent.id) },
      data: {
        tags: stringifyTags({
          ...parentTags,
          mergedTicketIds: nextMergedIds,
          mergedTicketNumeros: nextMergedNumeros,
          mergeUpdatedAt: new Date().toISOString(),
        }),
        updatedAt: new Date(),
      },
    });

    const childTags = parseTags(child.tags);
    const { mergedParentTicketId, mergedParentTicketNumero, ...remainingChildTags } = childTags;
    void mergedParentTicketId;
    void mergedParentTicketNumero;

    await (db as any).ticket.update({
      where: { id: String(child.id) },
      data: {
        tags: stringifyTags(remainingChildTags),
        updatedAt: new Date(),
      },
    }).catch(() => null);

    await (db as any).ticketHistory.create({
      data: {
        ticketId: String(parent.id),
        userId,
        userName,
        action: 'ticket_dissociated',
        field: 'merge',
        oldValue: String(child.numero ?? child.id),
        newValue: null,
        timestamp: new Date(),
      },
    }).catch(() => null);

    await (db as any).ticketHistory.create({
      data: {
        ticketId: String(child.id),
        userId,
        userName,
        action: 'ticket_removed_from_parent',
        field: 'merge',
        oldValue: String(parent.numero ?? parent.id),
        newValue: null,
        timestamp: new Date(),
      },
    }).catch(() => null);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[tickets/:id/merge DELETE]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
