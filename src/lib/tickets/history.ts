export type HistoryLikeValue = unknown;

function decodeHtmlEntities(value: string) {
  const text = String(value ?? '');
  if (!text) return '';

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<!doctype html><body>${text}`, 'text/html');
      return String(doc.body.textContent ?? '').trim();
    } catch {
      // fall through to the server-safe branch
    }
  }

  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .trim();
}

function stripHtml(value: string) {
  return decodeHtmlEntities(String(value ?? '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function guessAttachmentKind(fileName?: string, fileType?: string) {
  const normalizedType = String(fileType ?? '').toLowerCase();
  const normalizedName = String(fileName ?? '').toLowerCase();
  if (normalizedType.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(normalizedName)) {
    return 'image';
  }
  if (normalizedType.includes('pdf') || /\.(pdf)$/i.test(normalizedName)) {
    return 'document';
  }
  if (normalizedType.includes('word') || normalizedType.includes('excel') || normalizedType.includes('powerpoint') || /\.(docx?|xlsx?|pptx?)$/i.test(normalizedName)) {
    return 'document';
  }
  return 'piece jointe';
}

function summarizePrimitiveValue(value: unknown) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return '';
    return stripHtml(text);
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return stripHtml(String(value));
}

function summarizeArrayValue(values: unknown[]) {
  const items = values
    .map((item) => summarizeHistoryValue(item))
    .filter(Boolean)
    .slice(0, 5);

  if (items.length === 0) return '';
  if (values.length > items.length) {
    return `${items.join(', ')} (+${values.length - items.length})`;
  }
  return items.join(', ');
}

function summarizeObjectValue(value: Record<string, unknown>) {
  const fileName = String(
    value.fileName ?? value.name ?? value.title ?? value.documentName ?? value.label ?? value.fileTitle ?? ''
  ).trim();
  const fileType = String(value.fileType ?? value.mimeType ?? value.type ?? '').trim();
  const uploadedByName = String(
    value.uploadedByName ?? value.deletedByName ?? value.createdByName ?? value.userName ?? value.actorName ?? value.updatedByName ?? ''
  ).trim();
  const ownerName = String(value.ownerName ?? value.inséréPar ?? value.insertedBy ?? value.inseredBy ?? '').trim();
  const subject = String(value.subject ?? value.reasonMessage ?? value.message ?? value.label ?? value.status ?? '').trim();

  if (fileName || fileType || uploadedByName || ownerName) {
    const kindLabel = guessAttachmentKind(fileName, fileType);
    const parts = [
      kindLabel === 'image' ? 'Image' : kindLabel === 'document' ? 'Document' : 'Piece jointe',
      fileName ? `"${fileName}"` : '',
      uploadedByName ? `par ${uploadedByName}` : '',
      ownerName && ownerName !== uploadedByName ? `insérée par ${ownerName}` : '',
    ].filter(Boolean);
    return parts.join(' ');
  }

  const exactStartAt = String(value.exactStartAt ?? '').trim();
  const exactClosedAt = String(value.exactClosedAt ?? '').trim();
  if (exactStartAt || exactClosedAt) {
    const parts = [
      exactStartAt ? `Début exact: ${exactStartAt}` : '',
      exactClosedAt ? `Clôture exacte: ${exactClosedAt}` : '',
      String(value.status ?? '').trim() ? `Statut: ${String(value.status).trim()}` : '',
    ].filter(Boolean);
    return parts.join(' • ');
  }

  if (subject) {
    const extraKeys = ['reasonPreset', 'reasonCustom', 'postponedUntil', 'adjournedCategory', 'status'];
    const extras = extraKeys
      .map((key) => {
        const raw = value[key];
        const text = summarizeHistoryValue(raw);
        return text ? `${key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ')}: ${text}` : '';
      })
      .filter(Boolean)
      .slice(0, 3);

    return [subject, ...extras].filter(Boolean).join(' • ');
  }

  const preferredKeys = [
    'status',
    'field',
    'category',
    'classification',
    'channel',
    'priority',
    'type',
    'ticketNumber',
    'numero',
    'site',
    'localite',
    'siteName',
    'locality',
    'technicianName',
    'userName',
    'label',
    'message',
    'title',
  ];
  const ignoredKeys = new Set([
    'bodyHtml',
    'content',
    'description',
    'descriptionHtml',
    'fileData',
    'html',
    'oldValue',
    'newValue',
    'responseHtml',
    'attachments',
    'comments',
    'history',
    'approvers',
    'approvalDescriptionHtml',
    'approvalResponseHtml',
  ]);

  const seenKeys = new Set<string>();
  const parts: string[] = [];
  const appendEntry = (key: string, raw: unknown) => {
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    const text = summarizeHistoryValue(raw);
    if (!text) return;
    parts.push(`${key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ')}: ${text}`);
  };

  preferredKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      appendEntry(key, value[key]);
    }
  });

  if (parts.length < 3) {
    Object.entries(value).forEach(([key, raw]) => {
      if (ignoredKeys.has(key) || seenKeys.has(key)) return;
      if (parts.length >= 4) return;
      appendEntry(key, raw);
    });
  }

  return parts.join(' • ');
}

export function summarizeHistoryValue(value: HistoryLikeValue): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return summarizeArrayValue(value);
  if (isPlainObject(value)) return summarizeObjectValue(value);

  const text = summarizePrimitiveValue(value);
  if (!text) return '';

  try {
    if (/^[\[{]/.test(text)) {
      const parsed = JSON.parse(text);
      return summarizeHistoryValue(parsed);
    }
  } catch {
    // keep the normalized text
  }

  return text;
}

export function formatHistoryFieldLabel(field?: string | null) {
  const normalized = String(field ?? '').trim().replace(/_/g, ' ');
  if (!normalized) return '';
  return normalized
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function formatHistoryActionLabel(action?: string | null) {
  const normalized = String(action ?? '').trim().toLowerCase();
  if (!normalized) return 'Événement';

  const labels: Record<string, string> = {
    created: 'Création',
    updated: 'Mise à jour',
    updated_field: 'Champ modifié',
    field_updated: 'Champ modifié',
    status_changed: 'Changement de statut',
    assigned: 'Assignation',
    commented: 'Commentaire',
    comment_created: 'Commentaire',
    sla_breach: 'Dépassement SLA',
    closed: 'Fermeture',
    reopened: 'Réouverture',
    eta_updated: 'ETA mise à jour',
    etr_updated: 'ETR mise à jour',
    soft_deleted: 'Corbeille',
    deleted: 'Suppression',
    exact_dates_updated: 'Dates exactes',
    exact_dates_deleted: 'Dates exactes',
    approval_requested: 'Approbation',
    approval_request_cancelled: 'Approbation',
    approval_approved: 'Approbation',
    approval_disapproved: 'Approbation',
    approval_reminder_sent: 'Approbation',
    approval_opened_analysis: 'Approbation',
    approval_pending: 'Approbation',
    approval_pending_cancelled: 'Approbation',
    attachment_uploaded: 'Pièce jointe',
    attachment_deleted: 'Pièce jointe',
  };

  if (labels[normalized]) return labels[normalized];
  if (normalized.startsWith('attachment_')) return 'Pièce jointe';
  return normalized.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

export function buildAttachmentHistorySentence(input: {
  actorName: string;
  action: 'uploaded' | 'deleted';
  fileName?: string;
  fileType?: string;
  ownerName?: string;
}) {
  const actorName = String(input.actorName ?? '').trim() || 'Utilisateur';
  const fileName = String(input.fileName ?? '').trim();
  const kind = guessAttachmentKind(fileName, input.fileType);
  const article = kind === 'image' ? "l'image" : kind === 'document' ? 'le document' : 'la pièce jointe';
  const title = fileName ? `« ${fileName} »` : '';
  const ownerName = String(input.ownerName ?? '').trim();

  if (input.action === 'uploaded') {
    const ownerSuffix = ownerName && ownerName !== actorName ? ` pour ${ownerName}` : '';
    return `${actorName} a ajouté ${article}${title ? ` ${title}` : ''}${ownerSuffix}`.trim();
  }

  const ownerSuffix = ownerName ? ` inséré${ownerName ? ` par ${ownerName}` : ''}` : '';
  return `${actorName} a supprimé ${article}${title ? ` ${title}` : ''}${ownerSuffix}`.trim();
}

function parseHistoryJsonValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (!/^[\[{]/.test(trimmed)) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function normalizeFieldKey(field?: string | null): string {
  return String(field ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function displayFieldLabel(field?: string | null): string {
  const normalized = normalizeFieldKey(field);
  const mapping: Record<string, string> = {
    site: 'le champ Site',
    site_name: 'le champ Site',
    siteid: 'le champ Site',
    localite: 'la localité',
    locality: 'la localité',
    localites: 'la localité',
    title: 'le titre',
    objet: 'le titre',
    subject: 'le titre',
    description: 'la description',
    resolution: 'la résolution',
    resolution_note: 'la résolution',
    status: 'le statut',
    technicien: 'les techniciens assignés',
    technician: 'les techniciens assignés',
    technicians: 'les techniciens assignés',
    assignee: 'les techniciens assignés',
    assigned_to: 'les techniciens assignés',
    due_date: "la date d'échéance",
    duedate: "la date d'échéance",
    comment: 'un commentaire public',
    comments: 'un commentaire public',
  };

  return mapping[normalized] ?? (field ? `le champ ${formatHistoryFieldLabel(field)}` : 'le ticket');
}

function extractListValues(value: unknown): string[] {
  const parsed = parseHistoryJsonValue(value);

  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => summarizeHistoryValue(item).trim())
      .filter(Boolean);
  }

  if (isPlainObject(parsed)) {
    const listCandidates = [
      parsed.technicians,
      parsed.technicien,
      parsed.assignees,
      parsed.assignedTo,
      parsed.localities,
      parsed.localites,
      parsed.sites,
      parsed.siteNames,
    ];
    const firstList = listCandidates.find((candidate) => Array.isArray(candidate));
    if (Array.isArray(firstList)) {
      return firstList
        .map((item) => summarizeHistoryValue(item).trim())
        .filter(Boolean);
    }
  }

  const text = summarizeHistoryValue(parsed).trim();
  if (!text) return [];

  return text
    .split(/[,;|]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueLower(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  values.forEach((value) => {
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) return;
    seen.add(normalized);
    output.push(value);
  });

  return output;
}

function computeListDiff(oldValue: unknown, newValue: unknown) {
  const oldItems = uniqueLower(extractListValues(oldValue));
  const newItems = uniqueLower(extractListValues(newValue));
  const oldSet = new Set(oldItems.map((item) => item.toLowerCase()));
  const newSet = new Set(newItems.map((item) => item.toLowerCase()));

  const added = newItems.filter((item) => !oldSet.has(item.toLowerCase()));
  const removed = oldItems.filter((item) => !newSet.has(item.toLowerCase()));

  return { added, removed, oldItems, newItems };
}

type HistoryEntryLike = {
  action?: unknown;
  field?: unknown;
  oldValue?: unknown;
  newValue?: unknown;
  userName?: unknown;
  userId?: unknown;
};

function extractCommentMediaLabels(html: string): string[] {
  const labels: string[] = [];

  const imgMatches = html.matchAll(/<img[^>]*>/gi);
  for (const match of imgMatches) {
    const tag = match[0];
    const altMatch = tag.match(/\balt=["']([^"']*)["']/i);
    const altText = altMatch ? altMatch[1].trim() : '';
    const srcMatch = tag.match(/\bsrc=["']([^"']*)["']/i);
    const srcText = srcMatch ? srcMatch[1].trim() : '';
    let label = '';
    if (altText) {
      label = altText;
    } else if (srcText && !srcText.startsWith('data:')) {
      const urlParts = srcText.replace(/\?.*$/, '').split('/');
      label = decodeURIComponent(urlParts[urlParts.length - 1] || '');
    }
    labels.push(label ? `Image « ${label} »` : 'Image insérée');
  }

  const videoMatches = html.matchAll(/<video[^>]*>/gi);
  for (const match of videoMatches) {
    const tag = match[0];
    const srcMatch = tag.match(/\bsrc=["']([^"']*)["']/i);
    const srcText = srcMatch ? srcMatch[1].trim() : '';
    const urlParts = (srcText || '').replace(/\?.*$/, '').split('/');
    const name = decodeURIComponent(urlParts[urlParts.length - 1] || '');
    labels.push(name ? `Vidéo « ${name} »` : 'Vidéo insérée');
  }

  const fileMatches = html.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi);
  for (const match of fileMatches) {
    const href = match[1].trim();
    const linkText = match[2].trim();
    if (linkText && !/^https?:\/\//i.test(linkText)) {
      labels.push(`Fichier « ${linkText} »`);
    } else if (href && !href.startsWith('#')) {
      const urlParts = href.replace(/\?.*$/, '').split('/');
      const name = decodeURIComponent(urlParts[urlParts.length - 1] || '');
      if (name) labels.push(`Fichier « ${name} »`);
    }
  }

  return labels;
}

function normalizeCommentContent(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map((item) => normalizeCommentContent(item)).filter(Boolean).join(' ');

  const raw = isPlainObject(value)
    ? String(value.content ?? value.message ?? value.body ?? value.text ?? value.comment ?? value.description ?? '').trim()
    : String(value);

  if (!raw) return '';

  const mediaLabels = extractCommentMediaLabels(raw);
  const textContent = stripHtml(raw).trim();

  const parts: string[] = [];
  if (textContent) parts.push(textContent);
  mediaLabels.forEach((label) => {
    if (!parts.includes(label)) parts.push(label);
  });

  if (parts.length === 0 && isPlainObject(value)) {
    return summarizeObjectValue(value as Record<string, unknown>);
  }

  return parts.join(' • ');
}

function isCommentVisible(payload: Record<string, unknown>, viewerId?: unknown, isSuperAdmin?: boolean) {
  if (!Boolean(payload.isPrivate ?? payload.private ?? payload.commentType === 'private')) {
    return true;
  }

  if (isSuperAdmin) return true;

  const authorId = String(payload.authorId ?? payload.userId ?? payload.createdById ?? '').trim();
  const viewer = String(viewerId ?? '').trim();
  if (!viewer || !authorId) return false;
  return viewer === authorId;
}

function formatCommentHistoryPayload(payload: Record<string, unknown>, context: {
  actor: string;
  action: string;
  viewerId?: unknown;
  isSuperAdmin?: boolean;
}) {
  const content = normalizeCommentContent(payload.content ?? payload.message ?? payload.body ?? payload.text ?? payload.comment ?? '');
  const oldContent = normalizeCommentContent(payload.oldContent ?? payload.previousContent ?? payload.before ?? '');
  const newContent = normalizeCommentContent(payload.newContent ?? payload.after ?? content);
  const isPrivate = Boolean(payload.isPrivate ?? payload.private ?? payload.commentType === 'private');
  const privacyLabel = isPrivate ? 'privé' : 'public';
  const visible = isCommentVisible(payload, context.viewerId, context.isSuperAdmin);
  const authorName = String(payload.authorName ?? payload.userName ?? '').trim();
  const authorSuffix = authorName && authorName !== context.actor ? ` de ${authorName}` : '';

  const headline = context.action === 'comment_deleted'
    ? `${context.actor} a supprimé un commentaire ${privacyLabel}${authorSuffix} sur le ticket`
    : context.action === 'comment_updated'
      ? `${context.actor} a modifié un commentaire ${privacyLabel}${authorSuffix} sur le ticket`
      : `${context.actor} a publié un commentaire ${privacyLabel}${authorSuffix} sur le ticket`;

  let contentLine = '';
  if (context.action === 'comment_updated' && visible && oldContent && newContent && oldContent !== newContent) {
    contentLine = `Contenu: Avant: ${oldContent} | Après: ${newContent}`;
  } else if (visible && newContent) {
    contentLine = `Contenu: ${newContent}`;
  } else if (!visible && isPrivate) {
    contentLine = 'Contenu: [privé]';
  }

  return [headline, contentLine].filter(Boolean).join(' • ');
}

export function formatHistoryInvestigationMessage(
  entry: HistoryEntryLike,
  options?: { includeFallback?: boolean; viewerId?: unknown; isSuperAdmin?: boolean }
) {
  const includeFallback = options?.includeFallback ?? false;
  const action = String(entry?.action ?? '').trim().toLowerCase();
  const field = normalizeFieldKey(String(entry?.field ?? ''));
  const actor = String(entry?.userName ?? '').trim() || 'Utilisateur';
  const oldParsed = parseHistoryJsonValue(entry?.oldValue);
  const newParsed = parseHistoryJsonValue(entry?.newValue);
  const oldText = summarizeHistoryValue(oldParsed).trim();
  const newText = summarizeHistoryValue(newParsed).trim();

  const isCommentAction =
    action.includes('comment')
    || field.includes('comment');

  if (isCommentAction) {
    const baseSource = (isPlainObject(newParsed) ? newParsed : isPlainObject(oldParsed) ? oldParsed : {}) as Record<string, unknown>;
    const source = action === 'comment_updated'
      ? {
          ...baseSource,
          oldContent: isPlainObject(oldParsed) ? (oldParsed as Record<string, unknown>).content ?? (oldParsed as Record<string, unknown>).message ?? '' : oldParsed,
          newContent: isPlainObject(newParsed) ? (newParsed as Record<string, unknown>).content ?? (newParsed as Record<string, unknown>).message ?? '' : newParsed,
        }
      : baseSource;
    const commentText = formatCommentHistoryPayload(source, {
      actor,
      action,
      viewerId: options?.viewerId,
      isSuperAdmin: options?.isSuperAdmin,
    });
    if (commentText) {
      return commentText;
    }
  }

  if (action === 'resolution_updated' || action === 'resolution_saved' || field === 'resolution') {
    const source = (isPlainObject(newParsed) ? newParsed : isPlainObject(oldParsed) ? oldParsed : {}) as Record<string, unknown>;
    const resolutionContent = normalizeCommentContent(
      source.content ?? source.resolutionDescription ?? source.description ?? source.message ?? source.label ?? newText
    );
    const resolutionStatus = String(source.status ?? '').trim();
    const privacyHint = resolutionStatus ? ` (${resolutionStatus})` : '';
    const contentLine = resolutionContent ? ` • Contenu: ${resolutionContent}` : '';
    return `${actor} a renseigné la résolution sur le ticket${privacyHint}${contentLine}`.trim();
  }

  const isAttachmentAction = action === 'attachment_uploaded' || action === 'attachment_deleted' || action.startsWith('attachment_');
  if (isAttachmentAction) {
    const source = (isPlainObject(newParsed) ? newParsed : isPlainObject(oldParsed) ? oldParsed : {}) as Record<string, unknown>;
    const fileName = String(source.fileName ?? source.name ?? source.title ?? source.documentName ?? '').trim();
    const fileType = String(source.fileType ?? source.mimeType ?? source.type ?? '').trim();
    const ownerName = String(source.uploadedByName ?? source.deletedByName ?? source.userName ?? '').trim();
    return buildAttachmentHistorySentence({
      actorName: actor,
      action: action === 'attachment_deleted' ? 'deleted' : 'uploaded',
      fileName,
      fileType,
      ownerName,
    });
  }

  const isTechField = ['technicien', 'technicians', 'technician', 'assignee', 'assigned_to'].includes(field);
  if (isTechField) {
    const diff = computeListDiff(oldParsed, newParsed);
    if (diff.added.length > 0 && diff.removed.length === 0 && diff.added.length === 1) {
      return `${actor} a ajouté le technicien assigné "${diff.added[0]}"`;
    }
    if (diff.removed.length > 0 && diff.added.length === 0 && diff.removed.length === 1) {
      return `${actor} a retiré le technicien assigné "${diff.removed[0]}"`;
    }
    if (diff.added.length > 0 || diff.removed.length > 0) {
      const parts = [
        diff.added.length ? `ajouté ${diff.added.map((name) => `"${name}"`).join(', ')}` : '',
        diff.removed.length ? `supprimé ${diff.removed.map((name) => `"${name}"`).join(', ')}` : '',
      ].filter(Boolean);
      return `${actor} a modifié les techniciens assignés (${parts.join(' ; ')})`;
    }
  }

  const isSiteOrLocality = ['site', 'site_name', 'localite', 'locality', 'localites'].includes(field);
  if (isSiteOrLocality) {
    const diff = computeListDiff(oldParsed, newParsed);
    if (diff.added.length > 0 || diff.removed.length > 0) {
      const parts = [
        diff.added.length ? `ajouté ${diff.added.map((name) => `"${name}"`).join(', ')}` : '',
        diff.removed.length ? `supprimé ${diff.removed.map((name) => `"${name}"`).join(', ')}` : '',
      ].filter(Boolean);
      const label = field.startsWith('site') ? 'le champ Site' : 'la localité';
      return `${actor} a modifié ${label} (${parts.join(' ; ')})`;
    }
  }

  const keyFieldLabels = new Set([
    'title',
    'objet',
    'subject',
    'resolution',
    'description',
    'status',
    'due_date',
    'duedate',
    'site',
    'site_name',
    'localite',
    'locality',
  ]);

  if (keyFieldLabels.has(field)) {
    if (oldText && newText && oldText !== newText) {
      return `${actor} a modifié ${displayFieldLabel(field)}: "${oldText}" -> "${newText}"`;
    }
    if (newText && !oldText) {
      return `${actor} a renseigné ${displayFieldLabel(field)}: "${newText}"`;
    }
  }

  if (!includeFallback) return '';

  if (oldText && newText && oldText !== newText) {
    return `${actor} a modifié ${displayFieldLabel(field)}: "${oldText}" -> "${newText}"`;
  }
  if (newText) {
    return `${actor} a mis à jour ${displayFieldLabel(field)}: "${newText}"`;
  }
  return `${actor} a modifié le ticket`;
}
