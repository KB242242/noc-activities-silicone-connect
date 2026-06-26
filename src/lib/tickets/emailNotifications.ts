import nodemailer from 'nodemailer';

type TicketLifecycleInput = {
  action: 'created' | 'pending' | 'escalated' | 'closed' | 'reopened' | 'trashed' | 'restored' | 'trash_warning' | 'deleted_permanently';
  ticketNumber: string;
  subject: string;
  status: string;
  creatorName?: string | null;
  actionBy?: string | null;
  actionAt?: string | Date | null;
  ticketDescription?: string | null;
  assignedTechnician?: string | null;
  locality?: string | null;
  transitionSummary?: string | null;
  receiver?: string;
  cc?: string | string[];
  fromOverride?: string;
  customMessage?: string;
  subjectOverride?: string;
  htmlBody?: string;
  textBody?: string;
};

type TicketMessageContentInput = {
  greeting?: string;
  intro?: string;
  ticketNumber: string;
  subject: string;
  description?: string | null;
  assignedTechnician?: string | null;
  locality?: string | null;
  status?: string | null;
  footer?: string;
  addTechnicianSignature?: boolean;
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toDisplayDateTime(value: string | Date | null | undefined) {
  if (!value) return 'N/A';
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('fr-FR');
}

function hasSemanticLine(content: string, regex: RegExp) {
  return regex.test(content);
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripRichHtmlToText(value: string) {
  const raw = String(value ?? '');
  return decodeHtmlEntities(
    raw
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<img[^>]*>/gi, ' ')
      .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
  );
}

export function buildTicketMessageContent(input: TicketMessageContentInput) {
  const greeting = String(input.greeting ?? '').trim();
  const intro = String(input.intro ?? '').trim();
  const title = `${String(input.ticketNumber ?? '').trim()} ${String(input.subject ?? '').trim()}`.trim();
  const descriptionRaw = String(input.description ?? '').trim();
  const assignedTechnician = String(input.assignedTechnician ?? '').trim();
  const locality = String(input.locality ?? '').trim();
  const status = String(input.status ?? '').trim();
  const footer = String(input.footer ?? '').trim();
  const addTechnicianSignature = input.addTechnicianSignature === true;

  const normalizedNames = assignedTechnician
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const pluralTechnicians = normalizedNames.length > 1;
  const technicianLabel = pluralTechnicians ? 'Techniciens assignés' : 'Technicien assigné';
  const normalizedTechnicianLine = assignedTechnician ? `${technicianLabel} : ${assignedTechnician}` : '';

  let description = stripRichHtmlToText(descriptionRaw);
  const techLineRegex = /^technicien(?:s)?\s+assign[ée]s?\s*:/i;

  const descriptionLines = description
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let hasTechnicianLine = false;
  const normalizedLines = descriptionLines.map((line) => {
    if (!techLineRegex.test(line)) return line;
    if (!normalizedTechnicianLine) return line;
    hasTechnicianLine = true;
    return normalizedTechnicianLine;
  });

  const dedupedLines: string[] = [];
  let keptTechnicianLine = false;
  for (const line of normalizedLines) {
    if (techLineRegex.test(line)) {
      if (keptTechnicianLine) continue;
      keptTechnicianLine = true;
    }
    dedupedLines.push(line);
  }

  description = dedupedLines.join('\n').trim();
  if (normalizedTechnicianLine) {
    if (/technicien(?:s)?\s+assign[ée]s?\s*:/i.test(description)) {
      description = description.replace(/technicien(?:s)?\s+assign[ée]s?\s*:\s*.*$/gim, normalizedTechnicianLine);
    }
  }

  const descriptionForChecks = description.toLowerCase();
  const extraLines: string[] = [];

  if (normalizedTechnicianLine && (!hasTechnicianLine || !hasSemanticLine(descriptionForChecks, /technicien(?:s)?\s+assign[ée]s?\s*:/i))) {
    extraLines.push(normalizedTechnicianLine);
  }
  if (locality && !hasSemanticLine(descriptionForChecks, /localit[eé]\s*:/i)) {
    extraLines.push(`Localite: ${locality}`);
  }
  if (status && !hasSemanticLine(descriptionForChecks, /statut\s*:/i)) {
    extraLines.push(`Statut: ${status}`);
  }

  const textParts = [
    greeting,
    intro,
    title,
    description || 'Aucune description',
    ...extraLines,
    footer,
    addTechnicianSignature ? 'Cordialement,\n\nNOC SILICONE CONNECT' : '',
  ].filter((line) => String(line).trim());

  const greetingHtml = greeting
    ? `<p style="margin:0 0 14px;white-space:pre-line;">${escapeHtml(greeting)}</p>`
    : '';
  const introHtml = intro
    ? `<p style="margin:0 0 16px;">${escapeHtml(intro)}</p>`
    : '';
  const signatureHtml = addTechnicianSignature
    ? '<p style="margin:16px 0 0;">Cordialement,</p><p style="margin:4px 0 0;font-weight:700;">NOC SILICONE CONNECT</p>'
    : '';

  const htmlParts = [
    greetingHtml,
    introHtml,
    `<p style="margin:0 0 14px;font-weight:700;">${escapeHtml(title)}</p>`,
    `<p style="margin:0 0 12px;white-space:pre-wrap;">${escapeHtml(description || 'Aucune description')}</p>`,
    ...extraLines.map((line) => `<p style="margin:0 0 4px;">${escapeHtml(line)}</p>`),
    footer ? `<p style="margin:16px 0 0;color:#64748b;font-size:12px;">${escapeHtml(footer)}</p>` : '',
    signatureHtml,
  ].filter(Boolean);

  return {
    text: textParts.join('\n\n'),
    html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;">${htmlParts.join('')}</div>`,
  };
}

function buildLifecycleHtml(input: TicketLifecycleInput) {
  const actionLabelMap: Record<TicketLifecycleInput['action'], string> = {
    created: 'Creation',
    pending: 'Mise en attente',
    escalated: 'Escalade',
    closed: 'Fermeture',
    reopened: 'Reouverture',
    trashed: 'Corbeille',
    restored: 'Restauration',
    trash_warning: 'Alerte corbeille',
    deleted_permanently: 'Suppression definitive',
  };
  const actionLabel = actionLabelMap[input.action] ?? 'Mise a jour';
  const ticketTitle = `${String(input.ticketNumber ?? '').trim()} ${String(input.subject ?? '').trim()}`.trim();
  const description = String(input.ticketDescription ?? '').trim() || 'Aucune description';
  const assignedTechnician = String(input.assignedTechnician ?? '').trim() || 'Non assigne';
  const locality = String(input.locality ?? '').trim() || 'Non precisee';
  const status = String(input.status ?? '').trim() || 'N/A';
  const actionBy = String(input.actionBy ?? input.creatorName ?? 'Systeme').trim();
  const actionDate = toDisplayDateTime(input.actionAt ?? new Date());
  const transitionSummary = String(input.transitionSummary ?? input.customMessage ?? '').trim()
    || `Le ticket a ete mis a jour par ${actionBy}.`;

  const { html } = buildTicketMessageContent({
    intro: `Action: ${actionLabel}`,
    ticketNumber: String(input.ticketNumber ?? ''),
    subject: String(input.subject ?? ''),
    description,
    assignedTechnician,
    locality,
    status,
    footer: `${transitionSummary} (${actionBy} - ${actionDate})`,
  });
  return html;
}

function buildTransporter() {
  // The recipient mailbox is ثابت in the ticket flow; only the SMTP transport changes
  // between Gmail auth in dev and local Postfix relay in prod.
  const host = String(process.env.SMTP_HOST ?? 'localhost').trim() || 'localhost';
  const port = Number(process.env.SMTP_PORT ?? '25');
  const user = String(process.env.SMTP_USER ?? '').trim();
  const pass = String(process.env.SMTP_PASS ?? '').trim();
  const secure = String(process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true';

  const transportConfig: Parameters<typeof nodemailer.createTransport>[0] = {
    host,
    port,
    secure,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    // Si user/pass sont fournis on s'authentifie, sinon Postfix local sans auth
    ...(user && pass ? { auth: { user, pass } } : {}),
  };

  return nodemailer.createTransport(transportConfig);
}

export async function sendTicketLifecycleEmail(input: TicketLifecycleInput) {
  try {
    const transporter = buildTransporter();
    if (!transporter) return false;

    // Keep the NOC sender identity stable so notifications remain consistent across environments.
    const from = String(input.fromOverride ?? process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noc@siliconeconnect.local').trim();
    const to = input.receiver ?? 'ange.bata@siliconeconnect.com';
    const actionLabelMap: Record<TicketLifecycleInput['action'], string> = {
      created: 'Creation',
      pending: 'Mise en attente',
      escalated: 'Escalade',
      closed: 'Fermeture',
      reopened: 'Reouverture',
      trashed: 'Corbeille',
      restored: 'Restauration',
      trash_warning: 'Alerte corbeille',
      deleted_permanently: 'Suppression definitive',
    };
    const actionLabel = actionLabelMap[input.action] ?? 'Mise a jour';
    const subject = input.subjectOverride?.trim() || `[Ticket ${actionLabel}] ${input.ticketNumber} - ${input.subject}`;
    const cc = Array.isArray(input.cc)
      ? input.cc.map((entry) => String(entry).trim()).filter(Boolean).join(', ')
      : String(input.cc ?? '').trim();
    const html = input.htmlBody?.trim() || buildLifecycleHtml(input);
    const text = input.textBody?.trim() || [
      `Action: ${actionLabel}`,
      `${input.ticketNumber} ${input.subject}`,
      String(input.ticketDescription ?? '').trim() || 'Aucune description',
      String(input.transitionSummary ?? input.customMessage ?? '').trim() || `${input.actionBy ?? input.creatorName ?? 'Systeme'} - ${toDisplayDateTime(input.actionAt ?? new Date())}`,
    ].filter(Boolean).join('\n\n');

    await transporter.sendMail({
      from,
      to,
      ...(cc ? { cc } : {}),
      subject,
      text,
      html,
    });

    return true;
  } catch (error) {
    console.error('[ticket email notification]', error);
    return false;
  }
}
