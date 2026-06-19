import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mapTicket } from '@/lib/tickets/mapTicket';
import { buildTicketMessageContent, sendTicketLifecycleEmail } from '@/lib/tickets/emailNotifications';
import { canDecideTicketApproval, canManageTicketApprovalFlow, canManageTicketEntities } from '@/lib/tickets/permissions';
import { extractTechnicianIds, validateTechnicianWeeklyCapacity } from '@/lib/tickets/technicianCapacity';
import { promises as fs } from 'fs';
import path from 'path';

const TICKET_SETTINGS_FILE = path.join(process.cwd(), 'data', 'ticket_settings.json');

type TicketSettingsLite = {
  notificationEmails?: unknown[];
  supportCopyEmail?: unknown;
  technicianFallbackEmail?: unknown;
  lifecycleEmailEvents?: {
    creation?: unknown;
    pending?: unknown;
    escalated?: unknown;
    closed?: unknown;
    reopened?: unknown;
  };
  trashRetentionDays?: unknown;
};

async function loadTicketSettings(): Promise<TicketSettingsLite> {
  try {
    const raw = await fs.readFile(TICKET_SETTINGS_FILE, 'utf8');
    return JSON.parse(raw) as TicketSettingsLite;
  } catch {
    return {};
  }
}

function resolveTrashRetentionDays(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 30;
  return Math.min(365, Math.max(1, Math.floor(parsed)));
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return 'null';
  }
}

const SYSTEM_COMMENT_PREFIX = '🤖 Système';
const APPROVAL_MUTATION_KEY_PREFIX = 'approval';

function hasApprovalMutation(payload: Record<string, unknown>) {
  return Object.keys(payload).some((key) => key.startsWith(APPROVAL_MUTATION_KEY_PREFIX));
}

function toUpperString(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

function isApprovalDecisionAction(payload: Record<string, unknown>) {
  const decision = toUpperString(payload.approvalDecision);
  const status = toUpperString(payload.approvalStatus);
  return decision === 'APPROVED' || decision === 'DISAPPROVED'
    || status === 'APPROVED' || status === 'DISAPPROVED';
}

function isApprovalPendingCancellationAction(payload: Record<string, unknown>) {
  return toUpperString(payload.approvalAction) === 'PENDING_CANCEL';
}

function isApprovalRequestAction(payload: Record<string, unknown>) {
  const decision = toUpperString(payload.approvalDecision);
  const status = toUpperString(payload.approvalStatus);
  const signedById = String(payload.approvalSignedById ?? '').trim();
  const signedByName = String(payload.approvalSignedByName ?? '').trim();
  const signedByRole = String(payload.approvalSignedByRole ?? '').trim();
  const hasSigner = Boolean(signedById || signedByName || signedByRole);

  // A request is only the initial submission: REQUESTED state without signer metadata.
  // This avoids treating approver actions like "Mettre en attente" as a new request.
  return status === 'REQUESTED'
    && (decision === 'PENDING' || decision === 'NONE' || decision === '')
    && !isApprovalPendingCancellationAction(payload)
    && !hasSigner;
}

function isApprovalReminderAction(payload: Record<string, unknown>) {
  return toUpperString(payload.approvalAction) === 'REMINDER';
}

function isApprovalTransferAction(payload: Record<string, unknown>) {
  return toUpperString(payload.approvalAction) === 'TRANSFER';
}

function isApprovalOpenedAction(payload: Record<string, unknown>) {
  return toUpperString(payload.approvalAction) === 'OPENED';
}

function extractApprovalApproverIdsFromTags(tags: Record<string, unknown>): string[] {
  const fromIds = Array.isArray(tags.approvalApproverIds)
    ? tags.approvalApproverIds.map((value) => String(value ?? '').trim()).filter(Boolean)
    : [];
  if (fromIds.length > 0) return Array.from(new Set(fromIds));
  const fromApprovers = Array.isArray(tags.approvalApprovers)
    ? tags.approvalApprovers.map((entry: any) => String(entry?.id ?? '').trim()).filter(Boolean)
    : [];
  return Array.from(new Set(fromApprovers));
}

function buildSystemCommentUserName(actorName: string) {
  return `${SYSTEM_COMMENT_PREFIX} — ${actorName}`;
}

function formatTicketStatusLabel(status: unknown) {
  switch (String(status ?? '').trim().toUpperCase()) {
    case 'OPEN':
      return 'Ouvert';
    case 'IN_PROGRESS':
      return 'En cours';
    case 'PENDING':
      return 'En attente';
    case 'ESCALATED':
      return 'Escalade';
    case 'RESOLVED':
      return 'Resolue';
    case 'CLOSED':
      return 'Ferme';
    case 'TRASHED':
      return 'Corbeille';
    default:
      return String(status ?? 'Ouvert').trim() || 'Ouvert';
  }
}

function canonicalTicketStatus(status: unknown) {
  const raw = String(status ?? '').trim().toUpperCase();
  if (raw === 'OUVERT') return 'OPEN';
  if (raw === 'EN COURS' || raw === 'EN_COURS') return 'IN_PROGRESS';
  if (raw === 'EN ATTENTE' || raw === 'EN_ATTENTE') return 'PENDING';
  if (raw === 'ESCALADE' || raw === 'ESCALADÉ' || raw === 'ESCALADEE') return 'ESCALATED';
  if (raw === 'RESOLU' || raw === 'RESOLUE' || raw === 'RÉSOLU' || raw === 'RÉSOLUE') return 'RESOLVED';
  if (raw === 'FERME' || raw === 'FERMÉ') return 'CLOSED';
  return raw;
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

function formatOptionalTicketDate(value: unknown) {
  if (!value) return 'Aucun';
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('fr-FR');
}

function normalizeOptionalTagDateInput(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const lowered = raw.toLowerCase();
  if (lowered === 'null' || lowered === 'undefined') return '';
  return raw;
}

function normalizeTicketNumber(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return 'Aucun';
  return raw.startsWith('#') ? raw : `#${raw}`;
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

function isTicketStateSyncCommentContent(content: unknown) {
  const raw = String(content ?? '');
  return /Date d\s*echeance du ticket\s*:/i.test(raw)
    && /Responsable Ticket\s*:/i.test(raw)
    && /Priorit[eé]\s*:/i.test(raw);
}

function buildExactDateSummary(exactStartAt: unknown, exactClosedAt: unknown) {
  const start = exactStartAt ? formatOptionalTicketDate(exactStartAt) : '';
  const closed = exactClosedAt ? formatOptionalTicketDate(exactClosedAt) : '';
  if (start && closed) return `Debut: ${start} | Fermeture: ${closed}`;
  if (start) return `Debut: ${start}`;
  if (closed) return `Fermeture: ${closed}`;
  return '';
}

function resolveOwnerTechnicianName(tags: Record<string, unknown>) {
  const explicitName = String(tags.ownerTechnicianName ?? '').trim();
  if (explicitName) return explicitName;

  const ownerId = String(tags.ownerTechnicianId ?? '').trim();
  const technicianNames = Array.isArray(tags.technicianNames) ? tags.technicianNames : [];
  const matchedById = technicianNames.find((entry: any) => String(entry?.id ?? '').trim() === ownerId);
  const matchedName = String(matchedById?.name ?? '').trim();
  if (matchedName) return matchedName;

  const firstName = String((technicianNames[0] as any)?.name ?? '').trim();
  return firstName;
}

function buildTicketStateSyncComment(input: {
  status: unknown;
  dueDate: unknown;
  eta: unknown;
  etr: unknown;
  ownerTechnicianName: string;
  priority: unknown;
  category: unknown;
  classification: unknown;
  channel: unknown;
  exactStartAt: unknown;
  exactClosedAt: unknown;
  site: unknown;
  localite: unknown;
}) {
  const ownerLabel = String(input.ownerTechnicianName ?? '').trim() || 'Aucun';
  const normalizedPriority = String(input.priority ?? 'MEDIUM').trim().toUpperCase() || 'MEDIUM';
  const priorityLabel = normalizedPriority === 'LOW'
    ? 'Faible'
    : normalizedPriority === 'MEDIUM'
      ? 'Moyenne'
      : normalizedPriority === 'HIGH'
        ? 'Haute'
        : normalizedPriority === 'CRITICAL'
          ? 'Critique'
          : normalizedPriority;

  const lines = [
    `Statut du ticket: ${formatTicketStatusLabel(input.status)}`,
    `Date d echeance du ticket: ${formatOptionalTicketDate(input.dueDate)}`,
    `ETR: ${formatOptionalTicketDate(input.etr)}`,
    `Responsable Ticket: ${ownerLabel}`,
    `Priorité : ${priorityLabel}`,
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

async function purgeExpiredDeletedTickets(retentionDays: number) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  await (db as any).ticket.deleteMany({
    where: {
      isDeleted: true,
      deletedAt: { lte: cutoff },
    },
  });
}

async function loadNotificationEmails(): Promise<string[]> {
  try {
    const parsed = await loadTicketSettings();
    const emails = Array.isArray(parsed.notificationEmails)
      ? parsed.notificationEmails.map((item) => String(item).trim()).filter(Boolean)
      : [];
    return emails.length > 0 ? emails : ['kevinebauer7@gmail.com'];
  } catch {
    return ['kevinebauer7@gmail.com'];
  }
}

async function loadNotificationConfig() {
  const parsed = await loadTicketSettings();
  const notificationEmails = Array.isArray(parsed.notificationEmails)
    ? parsed.notificationEmails.map((item) => String(item).trim().toLowerCase()).filter(Boolean)
    : [];
  return {
    notificationEmails: notificationEmails.length > 0 ? notificationEmails : ['kevinebauer7@gmail.com'],
    supportCopyEmail: String(parsed.supportCopyEmail ?? 'support@siliconeconnect.com').trim().toLowerCase(),
    technicianFallbackEmail: String(parsed.technicianFallbackEmail ?? 'kevinebauer7@gmail.com').trim().toLowerCase(),
    lifecycleEmailEvents: {
      pending: Boolean(parsed.lifecycleEmailEvents?.pending ?? true),
      escalated: Boolean(parsed.lifecycleEmailEvents?.escalated ?? true),
      closed: Boolean(parsed.lifecycleEmailEvents?.closed ?? true),
      reopened: Boolean((parsed as any)?.lifecycleEmailEvents?.reopened ?? true),
    },
  };
}

function uniqueEmails(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim().toLowerCase()).filter(Boolean)));
}

function extractTagTechnicianIds(tags: Record<string, unknown>): string[] {
  return Array.isArray(tags.technicianIds)
    ? tags.technicianIds.map((value) => String(value ?? '').trim()).filter(Boolean)
    : [];
}

function extractLastHumanComment(ticket: any): string {
  const comments = Array.isArray(ticket?.comments) ? ticket.comments : [];
  const candidate = [...comments]
    .reverse()
    .find((entry: any) => !String(entry?.userName ?? '').startsWith(SYSTEM_COMMENT_PREFIX));
  const raw = String(candidate?.content ?? '').trim();
  return raw
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<img[^>]*>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeTechnicianList(value: unknown): string[] {
  return String(value ?? '')
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function sameTechnicianList(a: unknown, b: unknown) {
  const listA = normalizeTechnicianList(a);
  const listB = normalizeTechnicianList(b);
  if (listA.length !== listB.length) return false;
  return listA.every((item, idx) => item === listB[idx]);
}

async function loadRecipientGroups(): Promise<{ adminEmails: string[]; agentEmails: string[] }> {
  const configEmails = await loadNotificationEmails();
  const users = await (db as any).user.findMany({
    where: {
      role: {
        in: ['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE', 'TECHNICIEN', 'TECHNICIEN_NO', 'AGENT', 'SUPERVISOR'],
      },
    },
    select: {
      email: true,
      role: true,
      isActive: true,
    },
  }).catch(() => []);

  const adminRoles = new Set(['SUPER_ADMIN', 'ADMIN', 'RESPONSABLE']);
  const agentRoles = new Set(['TECHNICIEN', 'TECHNICIEN_NO', 'AGENT', 'SUPERVISOR']);

  const adminEmails = uniqueEmails([
    ...configEmails,
    ...users
      .filter((user: any) => user?.isActive !== false && adminRoles.has(String(user?.role ?? '').toUpperCase()))
      .map((user: any) => String(user?.email ?? '')),
  ]);

  const agentEmails = uniqueEmails(
    users
      .filter((user: any) => user?.isActive !== false && agentRoles.has(String(user?.role ?? '').toUpperCase()))
      .map((user: any) => String(user?.email ?? ''))
  );

  return { adminEmails, agentEmails };
}

async function writeAuditLog(payload: { userId: string; userName: string; action: string; details: string; status?: string }) {
  try {
    await (db as any).auditLog.create({
      data: {
        userId: payload.userId,
        userName: payload.userName,
        action: payload.action,
        details: payload.details,
        status: payload.status ?? 'SUCCESS',
      },
    });
  } catch {
    // audit log is best-effort only
  }
}

function pickMessage(templates: string[], seed: number): string {
  if (templates.length === 0) return '';
  return templates[Math.abs(seed) % templates.length];
}

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
        attachments: {
          select: {
            id: true,
            ticketId: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            uploadedBy: true,
            uploadedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                firstName: true,
              },
            },
          },
        },
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
    const actorId = String(body.updatedById ?? body.requesterId ?? '').trim();
    const actor = actorId
      ? await (db as any).user.findUnique({ where: { id: actorId }, select: { role: true } }).catch(() => null)
      : null;
    const isApprovalMutationRequest = hasApprovalMutation(body);
    const isApprovalRequestMutation = isApprovalRequestAction(body);
    const canManageEntities = canManageTicketEntities(actor?.role);
    const canManageApproval = canManageTicketApprovalFlow(actor?.role);
    if (!actorId) {
      return NextResponse.json({ error: 'Utilisateur requis' }, { status: 400 });
    }
    if (!canManageEntities && !(isApprovalMutationRequest && (canManageApproval || isApprovalRequestMutation))) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

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

    if (hasApprovalMutation(body) && isApprovalDecisionAction(body) && !canDecideTicketApproval(actor?.role)) {
      return NextResponse.json(
        { error: 'approval_decision_denied', message: 'Seuls manager et superviseur peuvent approuver/desapprouver.' },
        { status: 403 }
      );
    }

    if (hasApprovalMutation(body) && !canManageTicketApprovalFlow(actor?.role)) {
      const actorIdNormalized = String(actorId ?? '').trim();
      const currentApproverIds = extractApprovalApproverIdsFromTags(tags);
      const requestedById = String(tags.approvalRequestedById ?? '').trim();
      const isDecisionAction = isApprovalDecisionAction(body);
      const isRequestAction = isApprovalRequestAction(body);
      const isReminderAction = isApprovalReminderAction(body);
      const isTransferAction = isApprovalTransferAction(body);
      const isOpenedAction = isApprovalOpenedAction(body);
      const isPendingCancellationAction = isApprovalPendingCancellationAction(body);
      const isCancellationAction = toUpperString(body.approvalStatus) === 'NONE' && toUpperString(body.approvalDecision) === 'NONE';

      const canRequest = isRequestAction;
      const canRespondAsSelectedApprover = isDecisionAction && currentApproverIds.includes(actorIdNormalized);
      const canCancelOwnRequest = isCancellationAction && requestedById && requestedById === actorIdNormalized;
      const canReminderOwnRequest = isReminderAction && requestedById && requestedById === actorIdNormalized;
      const canOpenAsSelectedApprover = isOpenedAction && currentApproverIds.includes(actorIdNormalized);
      const canTransferAsSelectedApprover = isTransferAction && currentApproverIds.includes(actorIdNormalized);
      const canCancelPendingAsSelectedApprover = isPendingCancellationAction
        && canDecideTicketApproval(actor?.role)
        && currentApproverIds.includes(actorIdNormalized);

      if (
        !canRequest
        && !canRespondAsSelectedApprover
        && !canCancelOwnRequest
        && !canReminderOwnRequest
        && !canOpenAsSelectedApprover
        && !canTransferAsSelectedApprover
        && !canCancelPendingAsSelectedApprover
      ) {
        return NextResponse.json(
          { error: 'approval_access_denied', message: 'Vous n\'etes pas autorise a effectuer cette action d\'approbation.' },
          { status: 403 }
        );
      }
    }

    if (hasApprovalMutation(body)) {
      const actorIdNormalized = String(actorId ?? '').trim();
      const requestedById = String(tags.approvalRequestedById ?? '').trim();
      const currentApprovalStatus = toUpperString(tags.approvalStatus);
      const isRequestAction = isApprovalRequestAction(body);
      const isReminderAction = isApprovalReminderAction(body);
      const isTransferAction = isApprovalTransferAction(body);
      const isOpenedAction = isApprovalOpenedAction(body);
      const isPendingCancellationAction = isApprovalPendingCancellationAction(body);
      const isCancellationAction = toUpperString(body.approvalStatus) === 'NONE' && toUpperString(body.approvalDecision) === 'NONE';
      const currentApproverIds = extractApprovalApproverIdsFromTags(tags);
      const currentApprovalDecision = toUpperString(tags.approvalDecision);
      const currentSignedById = String(tags.approvalSignedById ?? '').trim();
      const currentSignedByName = String(tags.approvalSignedByName ?? '').trim();
      const currentSignedByRole = String(tags.approvalSignedByRole ?? '').trim();
      const hasCurrentPendingSigner = Boolean(currentSignedById || currentSignedByName || currentSignedByRole);

      if (isRequestAction && !isPendingCancellationAction && currentApprovalStatus === 'REQUESTED') {
        return NextResponse.json(
          {
            error: 'approval_request_already_exists',
            message: 'Une demande d\'approbation est deja en attente. Utilisez la relance ou annulez la demande actuelle.',
          },
          { status: 409 }
        );
      }

      if (isPendingCancellationAction) {
        if (currentApprovalStatus !== 'REQUESTED' || currentApprovalDecision !== 'PENDING' || !hasCurrentPendingSigner) {
          return NextResponse.json(
            {
              error: 'approval_pending_cancel_invalid_state',
              message: 'Aucune mise en attente active a annuler.',
            },
            { status: 409 }
          );
        }

        const canCancelPending = currentApproverIds.includes(actorIdNormalized)
          ? canDecideTicketApproval(actor?.role)
          : canManageTicketApprovalFlow(actor?.role);
        const canCancelPendingByManager = canManageTicketApprovalFlow(actor?.role);
        if (!(canCancelPending || canCancelPendingByManager)) {
          return NextResponse.json(
            {
              error: 'approval_pending_cancel_denied',
              message: 'Vous n\'etes pas autorise a annuler cette mise en attente.',
            },
            { status: 403 }
          );
        }

        body.approvalStatus = 'REQUESTED';
        body.approvalDecision = 'NONE';
        body.approvalResponseHtml = '';
        body.approvalSignedById = '';
        body.approvalSignedByName = '';
        body.approvalSignedByRole = '';
        body.approvalSignedAt = '';
      }

      if (isDecisionAction) {
        const decision = toUpperString(body.approvalDecision);
        if (decision === 'APPROVED' || decision === 'DISAPPROVED') {
          const existingSignatures = normalizeApprovalSignatures(tags.approvalSignatures);
          const nextSignature = buildApprovalSignature({
            id: actorIdNormalized,
            name: String(body.approvalSignedByName ?? '').trim() || String(body.updatedBy ?? '').trim() || 'Approbateur',
            role: String(body.approvalSignedByRole ?? '').trim() || String(actor?.role ?? '').trim(),
            decision,
            responseHtml: String(body.approvalResponseHtml ?? '').trim(),
            signedAt: String(body.approvalSignedAt ?? '').trim() || new Date().toISOString(),
            approvalIsPremium: body.approvalIsPremium === true,
          });
          const nextSignatures = [
            ...existingSignatures.filter((signature) => signature.id !== nextSignature.id),
            nextSignature,
          ];
          body.approvalSignatures = nextSignatures;

          const approverCount = Math.max(1, currentApproverIds.length);
          const approvedCount = nextSignatures.filter((signature) => signature.decision === 'APPROVED').length;
          const disapprovedCount = nextSignatures.filter((signature) => signature.decision === 'DISAPPROVED').length;

          if (disapprovedCount > 0) {
            body.approvalStatus = 'DISAPPROVED';
            body.approvalDecision = 'DISAPPROVED';
          } else if (approvedCount >= approverCount) {
            body.approvalStatus = 'APPROVED';
            body.approvalDecision = 'APPROVED';
          } else {
            body.approvalStatus = 'REQUESTED';
            body.approvalDecision = 'PENDING';
          }
        }
      }

      if (isCancellationAction && requestedById && requestedById !== actorIdNormalized) {
        return NextResponse.json(
          {
            error: 'approval_cancel_denied',
            message: 'Seul le createur de la demande peut annuler la demande d\'approbation.',
          },
          { status: 403 }
        );
      }

      if (isReminderAction) {
        if (currentApprovalStatus !== 'REQUESTED') {
          return NextResponse.json(
            {
              error: 'approval_reminder_invalid_state',
              message: 'La relance est possible uniquement quand la demande est en attente (REQUESTED).',
            },
            { status: 409 }
          );
        }

        if (!requestedById || requestedById !== actorIdNormalized) {
          return NextResponse.json(
            {
              error: 'approval_reminder_denied',
              message: 'Seul le createur de la demande peut effectuer une relance.',
            },
            { status: 403 }
          );
        }

        const reminderCount = Math.max(0, Number(tags.approvalReminderCount ?? 0) || 0);
        if (reminderCount >= 2) {
          return NextResponse.json(
            {
              error: 'approval_reminder_limit_reached',
              message: 'Le maximum de 2 relances est deja atteint.',
            },
            { status: 409 }
          );
        }

        const lastReminderRaw = String(tags.approvalLastReminderAt ?? '').trim();
        if (lastReminderRaw) {
          const lastReminderAt = new Date(lastReminderRaw);
          if (!Number.isNaN(lastReminderAt.getTime())) {
            const nextAllowedAt = lastReminderAt.getTime() + (60 * 60 * 1000);
            const nowTs = Date.now();
            if (nextAllowedAt > nowTs) {
              const remainingMinutes = Math.ceil((nextAllowedAt - nowTs) / (60 * 1000));
              return NextResponse.json(
                {
                  error: 'approval_reminder_too_early',
                  message: `La prochaine relance sera possible dans ${remainingMinutes} minute(s).`,
                },
                { status: 409 }
              );
            }
          }
        }
      }

      if (isOpenedAction) {
        if (currentApprovalStatus !== 'REQUESTED') {
          return NextResponse.json(
            {
              error: 'approval_opened_invalid_state',
              message: 'Le marquage de lecture est possible uniquement sur une demande en attente.',
            },
            { status: 409 }
          );
        }

        if (!currentApproverIds.includes(actorIdNormalized)) {
          return NextResponse.json(
            {
              error: 'approval_opened_denied',
              message: 'Seuls les approbateurs selectionnes peuvent marquer la demande comme lue.',
            },
            { status: 403 }
          );
        }

        const openedByFromBody = Array.isArray(body.approvalOpenedByIds)
          ? body.approvalOpenedByIds.map((value: unknown) => String(value ?? '').trim()).filter(Boolean)
          : [];
        if (!openedByFromBody.includes(actorIdNormalized)) {
          openedByFromBody.push(actorIdNormalized);
        }
        body.approvalOpenedByIds = Array.from(new Set(openedByFromBody));
      }

      if (isTransferAction) {
        if (currentApprovalStatus !== 'REQUESTED') {
          return NextResponse.json(
            {
              error: 'approval_transfer_invalid_state',
              message: 'Le transfert est possible uniquement sur une demande en attente.',
            },
            { status: 409 }
          );
        }

        const canTransferAsSelectedApprover = currentApproverIds.includes(actorIdNormalized);
        if (!canTransferAsSelectedApprover) {
          return NextResponse.json(
            {
              error: 'approval_transfer_denied',
              message: 'Seul un approbateur selectionne peut transferer cette demande.',
            },
            { status: 403 }
          );
        }

        const transferToId = String(body.approvalTransferToId ?? '').trim();
        if (!transferToId) {
          return NextResponse.json(
            {
              error: 'approval_transfer_target_required',
              message: 'Veuillez choisir un approbateur cible pour le transfert.',
            },
            { status: 400 }
          );
        }

        if (currentApproverIds.includes(transferToId)) {
          return NextResponse.json(
            {
              error: 'approval_transfer_target_same',
              message: 'Cet approbateur est deja assigne a la demande.',
            },
            { status: 409 }
          );
        }

        if (transferToId === actorIdNormalized) {
          return NextResponse.json(
            {
              error: 'approval_transfer_target_self',
              message: 'Un approbateur ne peut pas se transferer la demande a lui-meme.',
            },
            { status: 409 }
          );
        }

        const targetUser = await (db as any).user.findUnique({
          where: { id: transferToId },
          select: { id: true, name: true, email: true, role: true },
        });

        if (!targetUser) {
          return NextResponse.json(
            {
              error: 'approval_transfer_target_not_found',
              message: 'Approbateur cible introuvable.',
            },
            { status: 404 }
          );
        }

        body.approvalApproverIds = [String(targetUser.id)];
        body.approvalApprovers = [{
          id: String(targetUser.id),
          name: String(targetUser.name ?? '').trim() || String(targetUser.email ?? '').trim() || 'Approbateur',
          email: String(targetUser.email ?? '').trim(),
          role: String(targetUser.role ?? '').trim(),
        }];
        body.approvalOpenedByIds = [];
      }
    }

    // Merge updated fields into tags
    const updatedTags: Record<string, unknown> = {
      ...tags,
      ...rest,
      ...(resolutionDescription !== undefined ? { resolutionDescription } : {}),
      ...(resolutionCause !== undefined ? { resolutionCause } : {}),
    };
    delete (updatedTags as Record<string, unknown>).approvalAction;
    delete (updatedTags as Record<string, unknown>).approvalTransferToId;

    // Ensure clearing ETA/ETR in UI removes persisted values instead of keeping stale ones.
    if ('eta' in rest) {
      const normalizedEta = normalizeOptionalTagDateInput((rest as Record<string, unknown>).eta);
      if (normalizedEta) {
        updatedTags.eta = normalizedEta;
      } else {
        delete updatedTags.eta;
      }
    }
    if ('etr' in rest) {
      const normalizedEtr = normalizeOptionalTagDateInput((rest as Record<string, unknown>).etr);
      if (normalizedEtr) {
        updatedTags.etr = normalizedEtr;
      } else {
        delete updatedTags.etr;
      }
    }

    const updateData: Record<string, unknown> = {};
    const updatedTagsJson = safeStringify(updatedTags);
    const existingTagsJson = existing.tags ?? '{}';
    const currentDueDateIso = existing.dueDate ? new Date(existing.dueDate).toISOString() : null;
    const requestedDueDate = dueDate ? new Date(dueDate) : null;
    const requestedDueDateIso = requestedDueDate ? requestedDueDate.toISOString() : null;
    const dueDateChanged = dueDate !== undefined && currentDueDateIso !== requestedDueDateIso;
    const previousEta = normalizeOptionalTagDateInput((tags as Record<string, unknown>).eta);
    const nextEta = normalizeOptionalTagDateInput((updatedTags as Record<string, unknown>).eta);
    const previousEtr = normalizeOptionalTagDateInput((tags as Record<string, unknown>).etr);
    const nextEtr = normalizeOptionalTagDateInput((updatedTags as Record<string, unknown>).etr);
    const previousOwnerTechnicianId = String((tags as Record<string, unknown>).ownerTechnicianId ?? '').trim();
    const nextOwnerTechnicianId = String((updatedTags as Record<string, unknown>).ownerTechnicianId ?? '').trim();
    const previousOwnerTechnicianName = resolveOwnerTechnicianName(tags);
    const nextOwnerTechnicianName = resolveOwnerTechnicianName(updatedTags);
    const previousCategory = String((tags as Record<string, unknown>).category ?? '').trim();
    const nextCategory = String((updatedTags as Record<string, unknown>).category ?? '').trim();
    const previousClassification = String((tags as Record<string, unknown>).classification ?? '').trim();
    const nextClassification = String((updatedTags as Record<string, unknown>).classification ?? '').trim();
    const previousChannel = String((tags as Record<string, unknown>).channel ?? '').trim();
    const nextChannel = String((updatedTags as Record<string, unknown>).channel ?? '').trim();
    if (updatedTagsJson !== existingTagsJson) {
      updateData.tags = updatedTagsJson;
    }

    const nextStatusNormalized = status !== undefined ? String(status).toUpperCase() : undefined;
    if (nextStatusNormalized !== undefined && nextStatusNormalized !== String(existing.status ?? '').toUpperCase()) {
      updateData.status = nextStatusNormalized;
    }

    const nextObjetNormalized = objet !== undefined ? String(objet ?? '').toUpperCase() : undefined;
    if (priority !== undefined && priority !== existing.priority) updateData.priority = priority;
    if (nextObjetNormalized !== undefined && nextObjetNormalized !== String(existing.objet ?? '')) updateData.objet = nextObjetNormalized;
    if (description !== undefined && description !== existing.description) updateData.description = description;
    if (dueDate !== undefined) {
      if (dueDateChanged) {
        updateData.dueDate = requestedDueDate;
      }
    }

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
    const previousSite = resolvePrimarySite(tags as Record<string, unknown>, existing.site);
    const nextSite = resolvePrimarySite(
      updatedTags as Record<string, unknown>,
      'siteNames' in rest || 'siteIds' in rest ? siteNames.join(', ') : existing.site
    );
    const previousLocalite = resolvePrimaryLocality(tags as Record<string, unknown>, existing.localite);
    const nextLocalite = resolvePrimaryLocality(
      updatedTags as Record<string, unknown>,
      'localities' in rest ? localities.join(', ') : existing.localite
    );

    if ('localities' in rest) {
      const localite = localities.length > 0 ? localities.join(', ') : null;
      if (localite !== (existing.localite ?? null)) updateData.localite = localite;
    }
    if ('siteNames' in rest || 'siteIds' in rest) {
      const siteValue = siteNames.length > 0 ? siteNames.join(', ') : null;
      if (siteValue !== (existing.site ?? null)) updateData.site = siteValue;
    }
    if ('technicianNames' in rest || 'technicianIds' in rest) {
      const technicien = technicianNames.length > 0 ? technicianNames.join(', ') : null;
      const assigneeName = technicianNames.length > 0 ? technicianNames[0] : null;
      if (technicien !== (existing.technicien ?? null)) updateData.technicien = technicien;
      if (assigneeName !== (existing.assigneeName ?? null)) updateData.assigneeName = assigneeName;
    }

    const nextStatus = String(status ?? existing.status ?? 'OPEN').toUpperCase();
    if (!isApprovalMutationRequest && nextStatus !== 'RESOLVED' && nextStatus !== 'CLOSED') {
      const existingTags = tags && typeof tags === 'object' ? tags : {};
      const technicianScope = extractTechnicianIds({
        assigneeId: ('assigneeId' in rest ? (rest as Record<string, unknown>).assigneeId : existing.assigneeId),
        ownerTechnicianId: ('ownerTechnicianId' in rest ? (rest as Record<string, unknown>).ownerTechnicianId : (existingTags as Record<string, unknown>).ownerTechnicianId),
        technicianIds: ('technicianIds' in rest ? (rest as Record<string, unknown>).technicianIds : (existingTags as Record<string, unknown>).technicianIds),
        technicianNames: ('technicianNames' in rest ? (rest as Record<string, unknown>).technicianNames : (existingTags as Record<string, unknown>).technicianNames),
      });
      const capacity = await validateTechnicianWeeklyCapacity({
        technicianIds: technicianScope,
        excludeTicketId: id,
      });
      if (!capacity.ok) {
        return NextResponse.json(
          {
            error: 'technician_capacity_exceeded',
            message: 'Un technicien a deja 3 tickets actifs cette semaine. Veuillez reassigner le ticket.',
            details: capacity.technicians,
          },
          { status: 409 }
        );
      }
    }

    // Keep lifecycle timestamps aligned with the new status
    if (nextStatus === 'CLOSED' && !existing.closedAt) {
      updateData.closedAt = new Date();
    } else if (nextStatus === 'RESOLVED' && !existing.resolvedAt) {
      updateData.resolvedAt = new Date();
    } else if (nextStatus === 'OPEN' || nextStatus === 'IN_PROGRESS' || nextStatus === 'ESCALATED' || nextStatus === 'PENDING') {
      if (existing.closedAt !== null) updateData.closedAt = null;
      if (existing.resolvedAt !== null) updateData.resolvedAt = null;
    }

    if (Object.keys(updateData).length === 0) {
      const unchanged = await (db as any).ticket.findUnique({
        where: { id },
        include: {
          attachments: {
            select: {
              id: true,
              ticketId: true,
              fileName: true,
              fileType: true,
              fileSize: true,
              uploadedBy: true,
              uploadedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  firstName: true,
                },
              },
            },
          },
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
      return NextResponse.json(mapTicket(unchanged ?? existing));
    }

    updateData.updatedAt = new Date();

    const historyEntries: Record<string, unknown>[] = [];
    const pushHistory = (field: string, oldValue: unknown, newValue: unknown, action = 'updated_field') => {
      if (JSON.stringify(oldValue ?? null) === JSON.stringify(newValue ?? null)) return;
      historyEntries.push({
        action,
        field,
        oldValue: oldValue === undefined || oldValue === null ? null : String(typeof oldValue === 'object' ? JSON.stringify(oldValue) : oldValue),
        newValue: newValue === undefined || newValue === null ? null : String(typeof newValue === 'object' ? JSON.stringify(newValue) : newValue),
        userId: body.updatedById ?? 'system',
        userName: updatedBy ?? 'Systeme',
        ticketId: id,
      });
    };

    pushHistory('status', existing.status, status ? String(status).toUpperCase() : undefined);
    pushHistory('priority', existing.priority, priority);
    pushHistory('objet', existing.objet, nextObjetNormalized);
    pushHistory('description', existing.description, description);
    pushHistory('dueDate', existing.dueDate ? new Date(existing.dueDate).toISOString() : null, dueDate ?? null);
    pushHistory('tags', existing.tags ?? null, updatedTagsJson);

    const shouldCreateStateSyncComment = Boolean(
      (nextStatusNormalized !== undefined && nextStatusNormalized !== String(existing.status ?? '').toUpperCase())
      || dueDateChanged
      || previousEta !== nextEta
      || previousEtr !== nextEtr
      || previousOwnerTechnicianId !== nextOwnerTechnicianId
      || previousOwnerTechnicianName !== nextOwnerTechnicianName
      || (priority !== undefined && priority !== existing.priority)
      || previousCategory !== nextCategory
      || previousClassification !== nextClassification
      || previousChannel !== nextChannel
      || previousSite !== nextSite
      || previousLocalite !== nextLocalite
    );

    const updated = await (db as any).ticket.update({
      where: { id },
      data: updateData,
      include: {
        attachments: {
          select: {
            id: true,
            ticketId: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            uploadedBy: true,
            uploadedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                firstName: true,
              },
            },
          },
        },
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

    // Create history entries
    if (historyEntries.length > 0) {
      await Promise.all(
        historyEntries.map((h) =>
          (db as any).ticketHistory.create({ data: h }).catch(() => null)
        )
      );
    }

    const commentUserId = String(body.updatedById ?? existing.reporterId ?? '').trim() || String(existing.reporterId ?? '').trim();
    if (shouldCreateStateSyncComment && commentUserId) {
      const syncCommentContent = buildTicketStateSyncComment({
        status: nextStatusNormalized ?? updated.status,
        dueDate: dueDateChanged ? requestedDueDate : existing.dueDate,
        eta: nextEta,
        etr: nextEtr,
        ownerTechnicianName: nextOwnerTechnicianName,
        priority: priority ?? updated.priority,
        category: (updatedTags as Record<string, unknown>).category,
        classification: (updatedTags as Record<string, unknown>).classification,
        channel: (updatedTags as Record<string, unknown>).channel,
        exactStartAt: (updatedTags as Record<string, unknown>).exactStartAt,
        exactClosedAt: (updatedTags as Record<string, unknown>).exactClosedAt,
        site: resolvePrimarySite(updatedTags as Record<string, unknown>, updated.site),
        localite: resolvePrimaryLocality(updatedTags as Record<string, unknown>, updated.localite),
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

      if (primarySyncComment?.id) {
        await (db as any).ticketComment.update({
          where: { id: primarySyncComment.id },
          data: {
            content: syncCommentContent,
            isPrivate: false,
            updatedAt: new Date(),
          },
        }).catch((err: unknown) => {
          console.error('[tickets/:id PUT] sync comment update failed', err);
        });
      } else {
        await (db as any).ticketComment.create({
          data: {
            ticketId: id,
            userId: commentUserId,
            userName: buildSystemCommentUserName(String(updatedBy ?? 'Systeme').trim() || 'Systeme'),
            content: syncCommentContent,
            isPrivate: false,
          },
        }).catch((err: unknown) => {
          console.error('[tickets/:id PUT] sync comment creation failed', err);
        });
      }

      if (duplicateSyncIds.length > 0) {
        await (db as any).ticketComment.deleteMany({
          where: {
            id: { in: duplicateSyncIds },
          },
        }).catch((err: unknown) => {
          console.error('[tickets/:id PUT] sync comment dedupe failed', err);
        });
      }
    }

    const nocMailbox = 'noc@siliconeconnect.com';
    const nocFromAddress = 'NOC Silicone Connect <noc@siliconeconnect.com>';
    const previousTags = tags as Record<string, unknown>;
    const currentTags = updatedTags as Record<string, unknown>;
    const statusChanged = String(existing.status ?? '').toUpperCase() !== String(updated.status ?? '').toUpperCase();
    const previousTechnicianIds = extractTagTechnicianIds(previousTags);
    const currentTechnicianIds = extractTagTechnicianIds(currentTags);
    const addedTechnicianIds = currentTechnicianIds.filter((idValue) => !previousTechnicianIds.includes(idValue));
    const removedTechnicianIds = previousTechnicianIds.filter((idValue) => !currentTechnicianIds.includes(idValue));

    const technicianListChanged = !sameTechnicianList(existing.technicien, updated.technicien);
    if (technicianListChanged && (addedTechnicianIds.length > 0 || removedTechnicianIds.length > 0)) {
      const targetIds = Array.from(new Set([...addedTechnicianIds, ...removedTechnicianIds]));
      const technicianUsers = targetIds.length > 0
        ? await (db as any).user.findMany({
            where: { id: { in: targetIds } },
            select: { id: true, name: true, email: true },
          }).catch(() => [])
        : [];
      const technicianById = new Map(technicianUsers.map((entry: any) => [String(entry.id), entry]));
      const actorName = String(updatedBy ?? '').trim() || String(body.updatedByName ?? '').trim() || 'Systeme';
      const currentDescription = String(updated.description ?? '').trim() || 'Aucune description';
      const currentTechnicianLabel = String(updated.technicien ?? updated.assigneeName ?? '').trim() || 'Non assigne';
      const currentLocality = String(updated.localite ?? '').trim() || 'Non precisee';

      for (const addedId of addedTechnicianIds) {
        const technician = technicianById.get(String(addedId));
        const email = String(technician?.email ?? '').trim().toLowerCase();
        if (!email) continue;
        const pseudo = String(technician?.name ?? '').trim() || 'Technicien';
        const { html, text } = buildTicketMessageContent({
          greeting: `Bonjour ${pseudo},`,
          intro: 'Vous avez ete ajoute(e) a ce ticket voici le detail,',
          ticketNumber: String(updated.numero ?? ''),
          subject: String(updated.objet ?? ''),
          description: currentDescription,
          assignedTechnician: currentTechnicianLabel,
          locality: currentLocality,
          status: formatTicketStatusLabel(updated.status),
          addTechnicianSignature: true,
        });
        void sendTicketLifecycleEmail({
          action: 'created',
          ticketNumber: String(updated.numero ?? ''),
          subject: String(updated.objet ?? ''),
          status: String(updated.status ?? ''),
          receiver: email,
          fromOverride: nocFromAddress,
          subjectOverride: `[AFFECTATION TICKET] ${updated.numero} - ${updated.objet}`,
          htmlBody: html,
          textBody: text,
        });
      }

      for (const removedId of removedTechnicianIds) {
        const technician = technicianById.get(String(removedId));
        const email = String(technician?.email ?? '').trim().toLowerCase();
        if (!email) continue;
        const pseudo = String(technician?.name ?? '').trim() || 'Technicien';
        const { html, text } = buildTicketMessageContent({
          greeting: `Bonjour ${pseudo},`,
          intro: `Vous avez ete retire au ticket ${String(updated.objet ?? '').trim()} dont vous avez ete assigne, voici le detail.`,
          ticketNumber: String(updated.numero ?? ''),
          subject: String(updated.objet ?? ''),
          description: currentDescription,
          assignedTechnician: currentTechnicianLabel,
          locality: currentLocality,
          status: formatTicketStatusLabel(updated.status),
          footer: 'Si vous contestez la decision, contactez le NOC: mailto:noc@siliconeconnect.com',
          addTechnicianSignature: true,
        });
        void sendTicketLifecycleEmail({
          action: 'restored',
          ticketNumber: String(updated.numero ?? ''),
          subject: String(updated.objet ?? ''),
          status: String(updated.status ?? ''),
          receiver: email,
          fromOverride: nocFromAddress,
          subjectOverride: `[RETRAIT ASSIGNATION] ${updated.numero} - ${updated.objet}`,
          htmlBody: html,
          textBody: text,
        });
      }

      if (!statusChanged) {
        const nocTransition = `${addedTechnicianIds.length > 0 ? `${addedTechnicianIds.length} technicien(s) ajoute(s)` : ''}${addedTechnicianIds.length > 0 && removedTechnicianIds.length > 0 ? ' / ' : ''}${removedTechnicianIds.length > 0 ? `${removedTechnicianIds.length} technicien(s) retire(s)` : ''}`;
        const { html, text } = buildTicketMessageContent({
          greeting: 'NOC SILICONE CONNECT,\nBonjour !,',
          intro: `Mise a jour des assignations techniciens (${nocTransition}) sur le ticket, voici le detail:`,
          ticketNumber: String(updated.numero ?? ''),
          subject: String(updated.objet ?? ''),
          description: String(updated.description ?? '').trim(),
          assignedTechnician: String(updated.technicien ?? updated.assigneeName ?? '').trim() || 'Non assigne',
          locality: String(updated.localite ?? '').trim() || 'Non precisee',
          status: formatTicketStatusLabel(updated.status),
          footer: `Mise a jour initiee par ${actorName}.`,
        });
        void sendTicketLifecycleEmail({
          action: 'created',
          ticketNumber: String(updated.numero ?? ''),
          subject: String(updated.objet ?? ''),
          status: String(updated.status ?? ''),
          receiver: nocMailbox,
          fromOverride: nocFromAddress,
          subjectOverride: `[MISE A JOUR ASSIGNATION] ${updated.numero} - ${updated.objet}`,
          htmlBody: html,
          textBody: text,
        });
      }
    }

    const previousStatus = canonicalTicketStatus(existing.status);
    const currentStatus = canonicalTicketStatus(updated.status);
    if (previousStatus !== currentStatus) {
      const notificationConfig = await loadNotificationConfig();
      const isReopenedTransition = (previousStatus === 'CLOSED' || previousStatus === 'RESOLVED')
        && (currentStatus === 'OPEN' || currentStatus === 'IN_PROGRESS' || currentStatus === 'PENDING' || currentStatus === 'ESCALATED');
      const shouldNotify = isReopenedTransition
        ? notificationConfig.lifecycleEmailEvents.reopened
        : (currentStatus === 'PENDING' && notificationConfig.lifecycleEmailEvents.pending)
          || (currentStatus === 'ESCALATED' && notificationConfig.lifecycleEmailEvents.escalated)
          || (currentStatus === 'CLOSED' && notificationConfig.lifecycleEmailEvents.closed);

      if (shouldNotify) {
        const technicianIds = extractTagTechnicianIds(currentTags);
        const assignedTechnicians = technicianIds.length > 0
          ? await (db as any).user.findMany({
              where: { id: { in: technicianIds } },
              select: { id: true, name: true, email: true },
            }).catch(() => [])
          : [];
        const technicianRecipients = assignedTechnicians
          .map((entry: any) => ({
            name: String(entry?.name ?? '').trim() || 'Technicien',
            email: String(entry?.email ?? '').trim().toLowerCase(),
          }))
          .filter((entry: { name: string; email: string }) => Boolean(entry.email));
        const nocRecipients = uniqueEmails([nocMailbox, ...notificationConfig.notificationEmails]);
        const statusLabelMap: Record<string, string> = {
          PENDING: 'En attente',
          ESCALATED: 'Escalade',
          CLOSED: 'Ferme',
          OPEN: 'Ouvert',
          IN_PROGRESS: 'En cours',
        };
        const statusLabel = statusLabelMap[currentStatus] ?? currentStatus;
        const actorName = String(updatedBy ?? '').trim() || String(body.updatedByName ?? '').trim() || 'Systeme';
        const actionAt = new Date();
        const eventAction = isReopenedTransition
          ? 'reopened'
          : currentStatus === 'PENDING'
            ? 'pending'
            : currentStatus === 'ESCALATED'
              ? 'escalated'
              : 'closed';
        const eventSubjectLabel = eventAction === 'reopened'
          ? 'Reouverture'
          : eventAction === 'pending'
            ? 'Mise en attente'
            : eventAction === 'escalated'
              ? 'Escalade'
              : 'Fermeture';
        const eventSubjectTag = eventAction === 'reopened'
          ? 'TICKET REOUVERT'
          : eventAction === 'pending'
            ? 'TICKET EN ATTENTE'
            : eventAction === 'escalated'
              ? 'TICKET ESCALADE'
              : 'TICKET FERME';
        const transitionSummary = `Le ticket est passe de ${formatTicketStatusLabel(previousStatus)} a ${statusLabel} initier par ${actorName}.`;

        const dedupeField = `status_notify:${previousStatus}->${currentStatus}`;
        const alreadySent = await (db as any).ticketHistory.findFirst({
          where: {
            ticketId: id,
            action: 'status_notification_sent',
            field: dedupeField,
            newValue: actorName,
            timestamp: { gte: new Date(Date.now() - 60 * 1000) },
          },
          select: { id: true },
        }).catch(() => null);
        if (alreadySent) {
          const refreshedAfterSkip = await (db as any).ticket.findUnique({
            where: { id },
            include: {
              attachments: {
                select: {
                  id: true,
                  ticketId: true,
                  fileName: true,
                  fileType: true,
                  fileSize: true,
                  uploadedBy: true,
                  uploadedAt: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      username: true,
                      firstName: true,
                    },
                  },
                },
              },
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
          return NextResponse.json(mapTicket(refreshedAfterSkip ?? updated));
        }

        const currentTicketDescription = String(updated.description ?? '').trim() || 'Aucune description';
        const currentAssignedTechnician = String(updated.assigneeName ?? updated.technicien ?? '').trim() || 'Non assigne';
        const currentLocality = String(updated.localite ?? '').trim() || 'Non precisee';
        const commentContext = extractLastHumanComment(updated);
        const statusIntro = isReopenedTransition
          ? `La mise en attente du ticket ${updated.numero} a ete annulee, le ticket est de nouveau ${statusLabel.toLowerCase()}.`
          : currentStatus === 'PENDING'
            ? `Le ticket ${updated.numero} a ete mis en attente${commentContext ? `, cause: ${commentContext}` : ''}.`
            : currentStatus === 'ESCALATED'
              ? `Le ticket ${updated.numero} a ete escalade${commentContext ? ` car ${commentContext}` : ''}.`
              : `Un ticket a ete ferme voici le detail.`;

        for (const receiver of nocRecipients) {
          const { html, text } = buildTicketMessageContent({
            greeting: 'NOC SILICONE CONNECT,\nBonjour !,',
            intro: statusIntro,
            ticketNumber: String(updated.numero ?? ''),
            subject: String(updated.objet ?? ''),
            description: currentTicketDescription,
            assignedTechnician: currentAssignedTechnician,
            locality: currentLocality,
            status: statusLabel,
            footer: transitionSummary,
          });
          void sendTicketLifecycleEmail({
            action: eventAction,
            ticketNumber: updated.numero,
            subject: updated.objet,
            status: statusLabel,
            creatorName: updated.reporterName,
            actionBy: actorName,
            actionAt,
            receiver,
            cc: notificationConfig.supportCopyEmail,
            fromOverride: nocFromAddress,
            subjectOverride: `[${eventSubjectTag}] ${updated.numero} - ${updated.objet}`,
            htmlBody: html,
            textBody: text,
          });
        }

        for (const tech of technicianRecipients) {
          const { html, text } = buildTicketMessageContent({
            greeting: `Bonjour ${tech.name},`,
            intro: 'Le ticket auquel vous etes assigne a ete mis a jour, voici le detail.',
            ticketNumber: String(updated.numero ?? ''),
            subject: String(updated.objet ?? ''),
            description: currentTicketDescription,
            assignedTechnician: currentAssignedTechnician,
            locality: currentLocality,
            status: statusLabel,
            addTechnicianSignature: true,
          });
          void sendTicketLifecycleEmail({
            action: eventAction,
            ticketNumber: updated.numero,
            subject: updated.objet,
            status: statusLabel,
            receiver: tech.email,
            fromOverride: nocFromAddress,
            subjectOverride: `[MISE A JOUR TICKET] ${updated.numero} - ${updated.objet} (${eventSubjectLabel})`,
            htmlBody: html,
            textBody: text,
          });
        }

        await (db as any).ticketHistory.create({
          data: {
            ticketId: id,
            userId: String(body.updatedById ?? 'system'),
            userName: actorName,
            action: 'status_notification_sent',
            field: dedupeField,
            oldValue: previousStatus,
            newValue: actorName,
            timestamp: new Date(),
          },
        }).catch(() => null);
      }
    }

    const refreshed = await (db as any).ticket.findUnique({
      where: { id },
      include: {
        attachments: {
          select: {
            id: true,
            ticketId: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            uploadedBy: true,
            uploadedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                firstName: true,
              },
            },
          },
        },
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

    return NextResponse.json(mapTicket(refreshed ?? updated));
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
    const { permanent } = body;

    const settings = await loadTicketSettings();
    const retentionDays = resolveTrashRetentionDays(settings.trashRetentionDays);
    await purgeExpiredDeletedTickets(retentionDays);

    const ticket = await (db as any).ticket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: 'Ticket non trouvé' }, { status: 404 });

    const deletedByRaw = String(body.deletedBy ?? '').trim();
    const actorById = deletedByRaw
      ? await (db as any).user.findUnique({
          where: { id: deletedByRaw },
          select: { id: true, name: true, email: true, username: true, role: true },
        }).catch(() => null)
      : null;
    const actor = actorById || (deletedByRaw
      ? await (db as any).user.findFirst({
          where: {
            OR: [
              { email: deletedByRaw },
              { username: deletedByRaw },
              { name: deletedByRaw },
            ],
          },
          select: { id: true, name: true, email: true, username: true, role: true },
        }).catch(() => null)
      : null);

    if (!canManageTicketEntities(actor?.role)) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const deletedById = String((actor?.id ?? deletedByRaw) || 'system');
    const actorName = String((actor?.name ?? body.deletedByName ?? deletedByRaw) || 'Utilisateur');
    const deletionTimestamp = new Date();
    const deletionMessage = `[${actorName}] a supprime le ticket [${ticket.numero}] a ${deletionTimestamp.toLocaleString('fr-FR')}`;
    const { adminEmails } = await loadRecipientGroups();

    if (permanent) {
      await (db as any).ticketHistory.create({
        data: {
          ticketId: id,
          userId: actor?.id ?? deletedById,
          userName: actorName,
          action: 'deleted',
          field: 'admin_action',
          oldValue: 'ticket_in_trash',
          newValue: `${deletionMessage} (suppression definitive)`,
          timestamp: deletionTimestamp,
        },
      }).catch(() => null);

      await (db as any).ticket.delete({ where: { id } });

      const templates = [
        `${actorName} a supprimé définitivement le ticket ${ticket.numero} (${ticket.objet}) le ${deletionTimestamp.toLocaleString('fr-FR')}.`,
        `Le ticket ${ticket.numero} - ${ticket.objet} vient d'être retiré de la corbeille de façon définitive par ${actorName}.`,
        `Action finale: ${actorName} a validé la suppression définitive du ticket ${ticket.numero} à ${deletionTimestamp.toLocaleString('fr-FR')}.`,
      ];
      const adminMessage = pickMessage(templates, deletionTimestamp.getTime());
      await Promise.all(
        adminEmails.map((receiver) =>
          sendTicketLifecycleEmail({
            action: 'deleted_permanently',
            ticketNumber: String(ticket.numero ?? id),
            subject: String(ticket.objet ?? 'Ticket'),
            status: 'DELETED',
            creatorName: String(ticket.reporterName ?? ''),
            receiver,
            customMessage: adminMessage,
          })
        )
      );

      await writeAuditLog({
        userId: deletedById,
        userName: actorName,
        action: 'TICKET_DELETED_PERMANENTLY',
        details: adminMessage,
      });

      return NextResponse.json({ success: true, retentionDays });
    }

    // Soft delete
    await (db as any).ticket.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: deletionTimestamp,
        deletedBy: deletedById,
      },
    });

    await (db as any).ticketHistory.create({
      data: {
        ticketId: id,
        userId: actor?.id ?? deletedById,
        userName: actorName,
        action: 'soft_deleted',
        field: 'admin_action',
        oldValue: 'active_ticket',
        newValue: `${deletionMessage} (retention: ${retentionDays} jours)`,
        timestamp: deletionTimestamp,
      },
    }).catch(() => null);

    const trashTemplates = [
      `${actorName} a déplacé le ticket ${ticket.numero} (${ticket.objet}) dans la corbeille.`,
      `Ticket ${ticket.numero} envoyé en corbeille par ${actorName}. Suppression automatique dans ${retentionDays} jours.`,
      `Le ticket ${ticket.numero} a été supprimé par ${actorName} et restera ${retentionDays} jours en corbeille.`,
    ];
    const adminTrashMessage = pickMessage(trashTemplates, deletionTimestamp.getTime());

    await Promise.all(
      adminEmails.map((receiver) =>
        sendTicketLifecycleEmail({
          action: 'trashed',
          ticketNumber: String(ticket.numero ?? id),
          subject: String(ticket.objet ?? 'Ticket'),
          status: 'TRASHED',
          creatorName: String(ticket.reporterName ?? ''),
          receiver,
          customMessage: adminTrashMessage,
        })
      )
    );

    await writeAuditLog({
      userId: deletedById,
      userName: actorName,
      action: 'TICKET_TRASHED',
      details: `${adminTrashMessage} Date: ${deletionTimestamp.toLocaleString('fr-FR')}`,
    });

    return NextResponse.json({ success: true, retentionDays });
  } catch (err) {
    console.error('[tickets/:id DELETE]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
