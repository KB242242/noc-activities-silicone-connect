import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mapTicket } from '@/lib/tickets/mapTicket';
import { resolveTicketManagerFromActorId } from '@/lib/tickets/permissions';

function parseDateInput(value: unknown): Date | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateFr(value: Date | string | null | undefined) {
  if (!value) return 'non définie';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('fr-FR');
}

const SYSTEM_COMMENT_PREFIX = '🤖 Système';

function buildSystemCommentUserName(actorName: string) {
  return `${SYSTEM_COMMENT_PREFIX} — ${actorName}`;
}

function formatTicketStatusLabel(status: unknown) {
  switch (String(status ?? '').trim().toUpperCase()) {
    case 'OPEN': return 'Ouvert';
    case 'IN_PROGRESS': return 'En cours';
    case 'PENDING': return 'En attente';
    case 'ESCALATED': return 'Escalade';
    case 'RESOLVED': return 'Resolue';
    case 'CLOSED': return 'Ferme';
    case 'TRASHED': return 'Corbeille';
    default: return String(status ?? 'Ouvert').trim() || 'Ouvert';
  }
}

function formatCategoryLabel(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return 'Aucun';
  if (normalized === 'incident' || normalized === 'inc') return 'Incident';
  if (normalized === 'deployment') return 'Deploiement';
  if (normalized === 'supervision' || normalized === 'su') return 'Supervision';
  if (normalized === 'ravitaillement') return 'Ravitaillement';
  if (normalized === 'client_complaint' || normalized === 'pc') return 'Plainte Client';
  if (normalized === 'routine_visit') return 'Visite de Routine';
  if (normalized === 'security') return 'Securite';
  if (normalized === 'maintenance') return 'Maintenance';
  if (normalized === 'survey') return 'Survey';
  return normalized;
}

function formatPriorityLabel(value: unknown) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'LOW') return 'Faible';
  if (normalized === 'MEDIUM') return 'Moyenne';
  if (normalized === 'HIGH') return 'Haute';
  if (normalized === 'CRITICAL') return 'Critique';
  return String(value ?? '').trim() || 'Aucun';
}

function formatOptionalTicketDate(value: unknown) {
  if (!value) return 'Aucun';
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('fr-FR');
}

function buildExactDateSummary(exactStartAt: unknown, exactClosedAt: unknown) {
  const start = exactStartAt ? formatOptionalTicketDate(exactStartAt) : '';
  const closed = exactClosedAt ? formatOptionalTicketDate(exactClosedAt) : '';
  if (start && closed) return `Debut: ${start} | Fermeture: ${closed}`;
  if (start) return `Debut: ${start}`;
  if (closed) return `Fermeture: ${closed}`;
  return '';
}

function resolvePrimarySite(tags: Record<string, unknown>, fallbackSite: unknown) {
  const siteNames = Array.isArray(tags.siteNames) ? tags.siteNames : [];
  const firstFromTags = String(siteNames[0] ?? '').trim();
  if (firstFromTags) return firstFromTags;
  return String(fallbackSite ?? '').split(',').map((part) => part.trim()).filter(Boolean)[0] ?? '';
}

function resolvePrimaryLocality(tags: Record<string, unknown>, fallbackLocalite: unknown) {
  const localities = Array.isArray(tags.localities) ? tags.localities : [];
  const firstFromTags = String(localities[0] ?? '').trim();
  if (firstFromTags) return firstFromTags;
  return String(fallbackLocalite ?? '').split(',').map((part) => part.trim()).filter(Boolean)[0] ?? '';
}

function resolveOwnerTechnicianName(tags: Record<string, unknown>, fallbackOwner: unknown) {
  const explicitName = String(tags.ownerTechnicianName ?? '').trim();
  if (explicitName) return explicitName;
  const ownerId = String(tags.ownerTechnicianId ?? '').trim();
  const technicianNames = Array.isArray(tags.technicianNames) ? tags.technicianNames : [];
  const matchedById = technicianNames.find((entry: any) => String(entry?.id ?? '').trim() === ownerId);
  const matchedName = String(matchedById?.name ?? '').trim();
  if (matchedName) return matchedName;
  const firstName = String((technicianNames[0] as any)?.name ?? '').trim();
  if (firstName) return firstName;
  return String(fallbackOwner ?? '').split(',').map((part) => part.trim()).filter(Boolean)[0] ?? 'Aucun';
}

function isTicketStateSyncCommentContent(content: unknown) {
  const raw = String(content ?? '');
  return /Date d\s*echeance du ticket\s*:/i.test(raw)
    && /Responsable Ticket\s*:/i.test(raw)
    && /Priorit[eé]\s*:/i.test(raw);
}

function buildTicketStateSyncComment(input: {
  status: unknown;
  dueDate: unknown;
  eta: unknown;
  etr: unknown;
  ownerTechnicianName: unknown;
  priority: unknown;
  category: unknown;
  classification: unknown;
  channel: unknown;
  exactStartAt: unknown;
  exactClosedAt: unknown;
  site: unknown;
  localite: unknown;
}) {
  const lines = [
    `Statut du ticket: ${formatTicketStatusLabel(input.status)}`,
    `Date d echeance du ticket: ${formatOptionalTicketDate(input.dueDate)}`,
    `ETR: ${formatOptionalTicketDate(input.etr)}`,
    `Responsable Ticket: ${String(input.ownerTechnicianName ?? '').trim() || 'Aucun'}`,
    `Priorité : ${formatPriorityLabel(input.priority)}`,
    `Categorie: ${formatCategoryLabel(input.category)}`,
    `Classification: ${String(input.classification ?? '').trim() || 'Aucune'}`,
    `Canal utilise: ${String(input.channel ?? '').trim() || 'Aucun'}`,
    `Site: ${String(input.site ?? '').trim() || 'Aucun'}`,
    `Localite: ${String(input.localite ?? '').trim() || 'Aucune'}`,
  ];

  if (String(input.eta ?? '').trim()) {
    lines.splice(2, 0, `ETA: ${formatOptionalTicketDate(input.eta)}`);
  }

  const exactDateLabel = buildExactDateSummary(input.exactStartAt, input.exactClosedAt);
  if (exactDateLabel) {
    lines.splice(lines.length - 2, 0, `Date exacte du ticket: ${exactDateLabel}`);
  }

  return lines.join('\n');
}

/** Picks a random phrase variant to avoid robotic/copy-paste look. */
function pick<T>(list: T[], seed: number): T {
  return list[Math.abs(seed) % list.length];
}

function buildExactDatesComment(input: {
  ticketNumero: string;
  actorName: string;
  createdAt: Date | string | null | undefined;
  previousStart: Date | null;
  nextStart: Date | null;
  previousClose: Date | null;
  nextClose: Date | null;
  statusAfter: string;
  changedStart: boolean;
  changedClose: boolean;
  isFirstTime: boolean;
}) {
  const seed = Date.now();
  const name = input.actorName;

  // ── FIRST TIME (creation) ──────────────────────────────────────────────────
  if (input.isFirstTime) {
    if (input.nextStart && !input.nextClose) {
      const intro = pick([
        `${name} a renseigné la date exacte de début de cet incident.`,
        `${name} vient d'enregistrer la date de début réelle de cet incident.`,
        `${name} a précisé le moment exact où cet incident a débuté.`,
      ], seed);
      const detail = `Date de début exacte : ${formatDateFr(input.nextStart)}. Rappel : ce ticket a été créé dans le système le ${formatDateFr(input.createdAt)}, mais l'événement avait déjà commencé avant cette date.`;
      const footer = `Aucune date de fermeture exacte n'a encore été renseignée — le ticket est toujours considéré comme ouvert.`;
      return `${intro} ${detail} ${footer}`;
    }

    if (!input.nextStart && input.nextClose) {
      const intro = pick([
        `${name} vient d'insérer une date de fermeture exacte pour ce ticket.`,
        `${name} a renseigné la date à laquelle cet incident s'est réellement terminé.`,
        `${name} a précisé la date exacte de résolution de cet incident.`,
      ], seed);
      const detail = `Date de fermeture exacte : ${formatDateFr(input.nextClose)}.`;
      const note = `À noter que la date de fermeture enregistrée par le système peut différer de cette date exacte — ce qui est tout à fait normal lorsque la clôture a été saisie après coup.`;
      return `${intro} ${detail} ${note}`;
    }

    if (input.nextStart && input.nextClose) {
      const intro = pick([
        `${name} a défini les deux dates exactes de cet incident.`,
        `${name} a renseigné les dates de début et de fermeture réelles de ce ticket.`,
        `${name} a précisé la chronologie exacte de cet incident.`,
      ], seed);
      const detail = `Début exact : ${formatDateFr(input.nextStart)} — Fermeture exacte : ${formatDateFr(input.nextClose)}.`;
      const note = `La date de fermeture système du ticket peut ne pas coïncider avec la date exacte renseignée ci-dessus, ce qui est attendu pour les incidents traités en différé.`;
      return `${intro} ${detail} ${note}`;
    }
  }

  // ── MODIFICATION ────────────────────────────────────────────────────────────
  const changes: string[] = [];

  if (input.changedStart && input.nextStart) {
    if (input.previousStart) {
      changes.push(pick([
        `La date exacte de début est passée de ${formatDateFr(input.previousStart)} à ${formatDateFr(input.nextStart)}.`,
        `Date de début exacte revue : ${formatDateFr(input.previousStart)} → ${formatDateFr(input.nextStart)}.`,
        `${name} a corrigé la date de début exacte — elle était le ${formatDateFr(input.previousStart)}, elle est maintenant le ${formatDateFr(input.nextStart)}.`,
      ], seed + 1));
    } else {
      changes.push(`Date exacte de début ajoutée : ${formatDateFr(input.nextStart)}.`);
    }
  }

  if (input.changedClose && input.nextClose) {
    if (input.previousClose) {
      changes.push(pick([
        `La date exacte de fermeture est passée de ${formatDateFr(input.previousClose)} à ${formatDateFr(input.nextClose)}.`,
        `Date de fermeture exacte mise à jour : ${formatDateFr(input.previousClose)} → ${formatDateFr(input.nextClose)}.`,
        `${name} a de nouveau modifié la date de fermeture exacte — elle était le ${formatDateFr(input.previousClose)}, elle est désormais le ${formatDateFr(input.nextClose)}.`,
      ], seed + 2));
      changes.push(`La date de fermeture système du ticket peut rester différente de cette date exacte.`);
    } else {
      changes.push(pick([
        `${name} vient d'insérer une date de fermeture exacte pour ce ticket : ${formatDateFr(input.nextClose)}.`,
        `Une date de fermeture exacte a été ajoutée par ${name} : ${formatDateFr(input.nextClose)}.`,
      ], seed + 3));
      changes.push(`La date de fermeture système du ticket peut différer de cette date exacte.`);
    }
  }

  if (changes.length === 0) {
    return `${name} a mis à jour les informations de dates exactes du ticket ${input.ticketNumero} sans modifier les valeurs de dates.`;
  }

  const intro = pick([
    `${name} a modifié les dates exactes du ticket ${input.ticketNumero}.`,
    `Mise à jour des dates exactes par ${name} sur le ticket ${input.ticketNumero}.`,
    `${name} a apporté des corrections à la chronologie exacte du ticket ${input.ticketNumero}.`,
  ], seed);

  return `${intro} ${changes.join(' ')}`;
}

function buildExactDatesDeletionComment(input: {
  actorName: string;
  ticketNumero: string;
  createdByName: string | null;
  createdAt: string | null;
  hadStart: Date | null;
  hadClose: Date | null;
}) {
  const seed = Date.now();
  const name = input.actorName;
  const wasSelf = !input.createdByName || input.createdByName === name;
  const insertedBy = wasSelf ? `qu'il avait précédemment renseignées` : `renseignées par ${input.createdByName}`;
  const insertedOn = input.createdAt ? ` le ${formatDateFr(input.createdAt)}` : '';

  const intro = pick([
    `${name} a supprimé les dates exactes de ce ticket (${insertedBy}${insertedOn}).`,
    `${name} a annulé les dates exactes ${insertedBy}${insertedOn} sur ce ticket.`,
    `Les dates exactes de ce ticket ont été retirées par ${name} (initialement ${insertedBy}${insertedOn}).`,
  ], seed);

  const details: string[] = [];
  if (input.hadStart) details.push(`Date de début exacte supprimée : ${formatDateFr(input.hadStart)}.`);
  if (input.hadClose) details.push(`Date de fermeture exacte supprimée : ${formatDateFr(input.hadClose)}.`);

  const footer = `Ces informations sont conservées dans l'historique du ticket à titre de traçabilité.`;

  return [intro, ...details, footer].join(' ');
}


export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const updatedById = String(body.updatedById ?? '').trim();
    const updatedByNameRaw = String(body.updatedByName ?? '').trim();
    const closeTicket = Boolean(body.closeTicket);

    if (!updatedById) {
      return NextResponse.json({ error: 'Utilisateur requis' }, { status: 400 });
    }

    const actorAccess = await resolveTicketManagerFromActorId(db, updatedById);
    if (!actorAccess.canManage) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const exactStartInput = parseDateInput(body.exactStartAt);
    const exactCloseInput = parseDateInput(body.exactClosedAt);

    if (!exactStartInput && !exactCloseInput && !closeTicket) {
      return NextResponse.json({ error: 'Aucune date exacte fournie' }, { status: 400 });
    }

    const ticket = await (db as any).ticket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket non trouvé' }, { status: 404 });
    }

    const actor = updatedById
      ? await (db as any).user.findUnique({
          where: { id: updatedById },
          select: { id: true, name: true, username: true },
        }).catch(() => null)
      : null;

    const actorId = String((actor?.id ?? ticket.reporterId) || 'system');
    const actorName = String(((actor?.name ?? actor?.username ?? updatedByNameRaw) || 'Utilisateur'));

    const currentStatus = String(ticket.status ?? 'OPEN').toUpperCase();
    const blockedClosureStatuses = new Set(['PENDING', 'ESCALATED']);
    if (blockedClosureStatuses.has(currentStatus) && (Boolean(exactCloseInput) || closeTicket)) {
      return NextResponse.json(
        { error: 'Impossible de renseigner une fermeture exacte sur un ticket en attente ou escaladé. Changez d\'abord le statut.' },
        { status: 409 }
      );
    }

    if (exactCloseInput && !closeTicket && currentStatus !== 'CLOSED' && currentStatus !== 'RESOLVED') {
      return NextResponse.json(
        { error: 'Pour renseigner une fermeture exacte, fermez d\'abord le ticket.' },
        { status: 409 }
      );
    }

    let tags: Record<string, unknown> = {};
    try {
      tags = JSON.parse(ticket.tags ?? '{}');
    } catch {
      tags = {};
    }

    const previousExactStart = parseDateInput(tags.exactStartAt);
    const previousExactClose = parseDateInput(tags.exactClosedAt);

    const nextExactStart = exactStartInput ?? previousExactStart;
    let nextExactClose = exactCloseInput ?? previousExactClose;

    if (closeTicket && !nextExactClose) {
      nextExactClose = new Date();
    }

    const changedStart = (previousExactStart?.toISOString() ?? null) !== (nextExactStart?.toISOString() ?? null);
    const changedClose = (previousExactClose?.toISOString() ?? null) !== (nextExactClose?.toISOString() ?? null);

    if (!changedStart && !changedClose && !closeTicket) {
      return NextResponse.json({ error: 'Aucun changement détecté sur les dates exactes.' }, { status: 400 });
    }

    const now = new Date();
    const updatedTags = {
      ...tags,
      ...(nextExactStart ? { exactStartAt: nextExactStart.toISOString() } : {}),
      ...(nextExactClose ? { exactClosedAt: nextExactClose.toISOString() } : {}),
      exactDatesUpdatedById: actorId,
      exactDatesUpdatedByName: actorName,
      exactDatesUpdatedAt: now.toISOString(),
      ...(tags.exactDatesCreatedAt
        ? {}
        : {
            exactDatesCreatedById: actorId,
            exactDatesCreatedByName: actorName,
            exactDatesCreatedAt: now.toISOString(),
          }),
    };

    const nextStatus = closeTicket ? 'CLOSED' : currentStatus;
    const updateData: Record<string, unknown> = {
      tags: JSON.stringify(updatedTags),
      updatedAt: now,
    };

    if (closeTicket && currentStatus !== 'CLOSED') {
      updateData.status = 'CLOSED';
    }

    if (nextExactClose) {
      updateData.closedAt = nextExactClose;
      if (nextStatus === 'CLOSED') {
        updateData.resolvedAt = nextExactClose;
      }
    }

    const updatedTicket = await (db as any).ticket.update({
      where: { id },
      data: updateData,
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

    const syncCommentContent = buildTicketStateSyncComment({
      status: updatedTicket.status,
      dueDate: updatedTicket.dueDate,
      eta: updatedTags.eta,
      etr: updatedTags.etr,
      ownerTechnicianName: resolveOwnerTechnicianName(updatedTags as Record<string, unknown>, updatedTicket.technicien),
      priority: updatedTicket.priority,
      category: updatedTags.category,
      classification: updatedTags.classification,
      channel: updatedTags.channel,
      exactStartAt: updatedTags.exactStartAt,
      exactClosedAt: updatedTags.exactClosedAt,
      site: resolvePrimarySite(updatedTags as Record<string, unknown>, updatedTicket.site),
      localite: resolvePrimaryLocality(updatedTags as Record<string, unknown>, updatedTicket.localite),
    });

    const existingSystemComments = await (db as any).ticketComment.findMany({
      where: {
        ticketId: id,
        userName: {
          startsWith: SYSTEM_COMMENT_PREFIX,
        },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        content: true,
      },
    }).catch(() => []);

    const existingSyncComments = Array.isArray(existingSystemComments)
      ? existingSystemComments.filter((entry: any) => isTicketStateSyncCommentContent(entry?.content))
      : [];

    const primarySyncComment = existingSyncComments[0];
    const duplicateSyncIds = existingSyncComments.slice(1).map((entry: any) => String(entry?.id ?? '').trim()).filter(Boolean);
    const syncCommentUserId = String((actor?.id) || ticket.reporterId || '').trim();

    if (primarySyncComment?.id) {
      await (db as any).ticketComment.update({
        where: { id: primarySyncComment.id },
        data: {
          content: syncCommentContent,
          isPrivate: false,
          updatedAt: new Date(),
        },
      }).catch(() => null);
    } else if (syncCommentUserId) {
      await (db as any).ticketComment.create({
        data: {
          ticketId: id,
          userId: syncCommentUserId,
          userName: buildSystemCommentUserName(actorName),
          content: syncCommentContent,
          isPrivate: false,
        },
      }).catch(() => null);
    }

    if (duplicateSyncIds.length > 0) {
      await (db as any).ticketComment.deleteMany({
        where: {
          id: { in: duplicateSyncIds },
        },
      }).catch(() => null);
    }

    const isFirstTime = !tags.exactDatesCreatedAt;
    const autoComment = buildExactDatesComment({
      ticketNumero: String(updatedTicket.numero ?? id),
      actorName,
      createdAt: updatedTicket.createdAt,
      previousStart: previousExactStart,
      nextStart: nextExactStart,
      previousClose: previousExactClose,
      nextClose: nextExactClose,
      statusAfter: String(updatedTicket.status ?? currentStatus).toUpperCase(),
      changedStart,
      changedClose,
      isFirstTime,
    });

    // System comment — must use a valid FK userId (reporter as fallback).
    // userName is prefixed with SYSTEM_COMMENT_PREFIX so UI can block editing.
    const commentUserId = String((actor?.id) || ticket.reporterId || '').trim();
    if (commentUserId) {
      await (db as any).ticketComment.create({
        data: {
          ticketId: id,
          userId: commentUserId,
          userName: buildSystemCommentUserName(actorName),
          content: autoComment,
          isPrivate: false,
        },
      }).catch((err: unknown) => {
        console.error('[exact-dates] system comment creation failed', err);
      });
    }

    await (db as any).ticketHistory.create({
      data: {
        ticketId: id,
        userId: actorId,
        userName: actorName,
        action: 'exact_dates_updated',
        field: 'exact_dates',
        oldValue: JSON.stringify({
          exactStartAt: previousExactStart?.toISOString() ?? null,
          exactClosedAt: previousExactClose?.toISOString() ?? null,
          status: currentStatus,
        }),
        newValue: JSON.stringify({
          exactStartAt: nextExactStart?.toISOString() ?? null,
          exactClosedAt: nextExactClose?.toISOString() ?? null,
          status: String(updatedTicket.status ?? currentStatus).toUpperCase(),
        }),
        timestamp: now,
      },
    }).catch(() => null);

    return NextResponse.json(mapTicket(updatedTicket));
  } catch (err) {
    console.error('[tickets/:id/exact-dates POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// DELETE  /api/tickets/:id/exact-dates  — supprime les dates exactes du ticket
// ──────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const deletedById = String(body.deletedById ?? '').trim();
    const deletedByNameRaw = String(body.deletedByName ?? '').trim();

    if (!deletedById) {
      return NextResponse.json({ error: 'Utilisateur requis' }, { status: 400 });
    }

    const actorAccess = await resolveTicketManagerFromActorId(db, deletedById);
    if (!actorAccess.canManage) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const ticket = await (db as any).ticket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket non trouvé' }, { status: 404 });
    }

    let tags: Record<string, unknown> = {};
    try {
      tags = JSON.parse(ticket.tags ?? '{}');
    } catch {
      tags = {};
    }

    const hadStart = parseDateInput(tags.exactStartAt);
    const hadClose = parseDateInput(tags.exactClosedAt);
    const createdByName = String(tags.exactDatesCreatedByName ?? '').trim() || null;
    const createdAt = String(tags.exactDatesCreatedAt ?? '').trim() || null;


    const actor = deletedById
      ? await (db as any).user.findUnique({
          where: { id: deletedById },
          select: { id: true, name: true, username: true },
        }).catch(() => null)
      : null;

    const actorId = String((actor?.id ?? ticket.reporterId) || 'system');
    const actorName = String(((actor?.name ?? actor?.username ?? deletedByNameRaw) || 'Utilisateur'));

    // On veut toujours créer un commentaire système pour la traçabilité, même si aucune date n'était présente
    let autoComment: string;
    if (!hadStart && !hadClose) {
      autoComment = `${actorName} a demandé la suppression des dates exactes, mais aucune date exacte n'était enregistrée pour ce ticket. Cette action est néanmoins tracée.`;
    } else {
      autoComment = buildExactDatesDeletionComment({
        actorName,
        ticketNumero: String(ticket.numero ?? id),
        createdByName,
        createdAt,
        hadStart,
        hadClose,
      });
    }

    // Strip all exactDates fields from tags
    const {
      exactStartAt: _s,
      exactClosedAt: _c,
      exactDatesCreatedAt: _ca,
      exactDatesCreatedById: _cbi,
      exactDatesCreatedByName: _cbn,
      exactDatesUpdatedAt: _ua,
      exactDatesUpdatedById: _ubi,
      exactDatesUpdatedByName: _ubn,
      ...cleanedTags
    } = tags;

    const now = new Date();
    const updatedTicket = await (db as any).ticket.update({
      where: { id },
      data: {
        tags: JSON.stringify(cleanedTags),
        updatedAt: now,
      },
      include: {
        attachments: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, username: true, firstName: true, name: true, avatar: true },
            },
          },
        },
        history: { orderBy: { timestamp: 'desc' }, take: 50 },
      },
    });

    const syncCommentContent = buildTicketStateSyncComment({
      status: updatedTicket.status,
      dueDate: updatedTicket.dueDate,
      eta: cleanedTags.eta,
      etr: cleanedTags.etr,
      ownerTechnicianName: resolveOwnerTechnicianName(cleanedTags as Record<string, unknown>, updatedTicket.technicien),
      priority: updatedTicket.priority,
      category: cleanedTags.category,
      classification: cleanedTags.classification,
      channel: cleanedTags.channel,
      exactStartAt: null,
      exactClosedAt: null,
      site: resolvePrimarySite(cleanedTags as Record<string, unknown>, updatedTicket.site),
      localite: resolvePrimaryLocality(cleanedTags as Record<string, unknown>, updatedTicket.localite),
    });

    const existingSystemComments = await (db as any).ticketComment.findMany({
      where: {
        ticketId: id,
        userName: {
          startsWith: SYSTEM_COMMENT_PREFIX,
        },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        content: true,
      },
    }).catch(() => []);

    const existingSyncComments = Array.isArray(existingSystemComments)
      ? existingSystemComments.filter((entry: any) => isTicketStateSyncCommentContent(entry?.content))
      : [];

    const primarySyncComment = existingSyncComments[0];
    const duplicateSyncIds = existingSyncComments.slice(1).map((entry: any) => String(entry?.id ?? '').trim()).filter(Boolean);
    const syncCommentUserId = String((actor?.id) || ticket.reporterId || '').trim();

    if (primarySyncComment?.id) {
      await (db as any).ticketComment.update({
        where: { id: primarySyncComment.id },
        data: {
          content: syncCommentContent,
          isPrivate: false,
          updatedAt: new Date(),
        },
      }).catch(() => null);
    } else if (syncCommentUserId) {
      await (db as any).ticketComment.create({
        data: {
          ticketId: id,
          userId: syncCommentUserId,
          userName: buildSystemCommentUserName(actorName),
          content: syncCommentContent,
          isPrivate: false,
        },
      }).catch(() => null);
    }

    if (duplicateSyncIds.length > 0) {
      await (db as any).ticketComment.deleteMany({
        where: {
          id: { in: duplicateSyncIds },
        },
      }).catch(() => null);
    }

    const commentUserId = String((actor?.id) || ticket.reporterId || '').trim();
    if (commentUserId) {
      await (db as any).ticketComment.create({
        data: {
          ticketId: id,
          userId: commentUserId,
          userName: buildSystemCommentUserName(actorName),
          content: autoComment,
          isPrivate: false,
        },
      }).catch((err: unknown) => {
        console.error('[exact-dates DELETE] system comment creation failed', err);
      });
    }

    await (db as any).ticketHistory.create({
      data: {
        ticketId: id,
        userId: actorId,
        userName: actorName,
        action: 'exact_dates_deleted',
        field: 'exact_dates',
        oldValue: JSON.stringify({
          exactStartAt: hadStart?.toISOString() ?? null,
          exactClosedAt: hadClose?.toISOString() ?? null,
        }),
        newValue: JSON.stringify({ exactStartAt: null, exactClosedAt: null }),
        timestamp: now,
      },
    }).catch(() => null);

    return NextResponse.json(mapTicket(updatedTicket));
  } catch (err) {
    console.error('[tickets/:id/exact-dates DELETE]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

