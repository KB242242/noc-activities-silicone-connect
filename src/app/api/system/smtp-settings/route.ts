import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { db } from '@/lib/db';
import { resolveTicketManagerFromActorId } from '@/lib/tickets/permissions';
import { getJwtClaims } from '@/lib/auth/request-auth';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SmtpSettings = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  /** Password is stored but never returned to the client in clear. */
  pass: string;
  from: string;
  /** Primary NOC mailbox — receives all ticket notifications and alerts. */
  nocMailbox: string;
  /** Extra addresses that always receive ticket lifecycle notifications. */
  extraNotificationEmails: string[];
  /** Enable or disable the test email endpoint. */
  testEnabled: boolean;
};

// ─── Store ────────────────────────────────────────────────────────────────────

const STORE_FILE = path.join(process.cwd(), 'data', 'smtp_settings.json');

const DEFAULT_SETTINGS: SmtpSettings = {
  host: String(process.env.SMTP_HOST ?? '127.0.0.1').trim() || '127.0.0.1',
  port: Number(process.env.SMTP_PORT ?? '25'),
  secure: String(process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true',
  user: String(process.env.SMTP_USER ?? '').trim(),
  pass: '', // never shipped back to the browser
  from: String(process.env.SMTP_FROM ?? 'NOC Silicone Connect <noc@siliconeconnect.com>').trim(),
  nocMailbox: 'noc@siliconeconnect.com',
  extraNotificationEmails: [],
  testEnabled: true,
};

async function ensureStore(): Promise<void> {
  const dir = path.dirname(STORE_FILE);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(STORE_FILE);
  } catch {
    await fs.writeFile(STORE_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf8');
  }
}

async function readStore(): Promise<SmtpSettings> {
  await ensureStore();
  const raw = await fs.readFile(STORE_FILE, 'utf8');
  try {
    const p = JSON.parse(raw) as Partial<SmtpSettings>;
    return {
      host: String(p.host ?? DEFAULT_SETTINGS.host).trim() || DEFAULT_SETTINGS.host,
      port: Number.isFinite(Number(p.port)) ? Number(p.port) : DEFAULT_SETTINGS.port,
      secure: Boolean(p.secure ?? DEFAULT_SETTINGS.secure),
      user: String(p.user ?? DEFAULT_SETTINGS.user).trim(),
      pass: String(p.pass ?? DEFAULT_SETTINGS.pass).trim(),
      from: String(p.from ?? DEFAULT_SETTINGS.from).trim() || DEFAULT_SETTINGS.from,
      nocMailbox: String(p.nocMailbox ?? DEFAULT_SETTINGS.nocMailbox).trim() || DEFAULT_SETTINGS.nocMailbox,
      extraNotificationEmails: Array.isArray(p.extraNotificationEmails)
        ? p.extraNotificationEmails.map((e) => String(e).trim()).filter(Boolean)
        : DEFAULT_SETTINGS.extraNotificationEmails,
      testEnabled: Boolean(p.testEnabled ?? DEFAULT_SETTINGS.testEnabled),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function writeStore(value: SmtpSettings): Promise<void> {
  await ensureStore();
  await fs.writeFile(STORE_FILE, JSON.stringify(value, null, 2), 'utf8');
}

/** Strip the password before returning to the browser. */
function sanitize(s: SmtpSettings): Omit<SmtpSettings, 'pass'> & { passSet: boolean } {
  const { pass, ...rest } = s;
  return { ...rest, passSet: pass.length > 0 };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireAdmin(request: NextRequest): Promise<boolean> {
  const claims = getJwtClaims(request);
  const requesterId = claims?.id;
  if (!requesterId) return false;
  try {
    const access = await resolveTicketManagerFromActorId(db, requesterId);
    return access.canManage && (access.role === 'ADMIN' || access.role === 'SUPER_ADMIN');
  } catch {
    return false;
  }
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

/** GET /api/system/smtp-settings — returns settings (password masked). */
export async function GET(request: NextRequest) {
  const ok = await requireAdmin(request);
  if (!ok) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });

  try {
    const settings = await readStore();
    return NextResponse.json(sanitize(settings));
  } catch {
    return NextResponse.json(sanitize(DEFAULT_SETTINGS));
  }
}

/** PUT /api/system/smtp-settings — save SMTP settings. */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ok = await requireAdmin(req);
    if (!ok) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });

    // Read existing settings to preserve current password if not updated.
    const existing = await readStore();

    const next: SmtpSettings = {
      host: String(body.host ?? existing.host).trim() || existing.host,
      port: Number.isFinite(Number(body.port)) ? Number(body.port) : existing.port,
      secure: Boolean(body.secure ?? existing.secure),
      user: String(body.user ?? existing.user).trim(),
      // Only update password if a non-empty value is provided.
      pass: String(body.pass ?? '').trim() || existing.pass,
      from: String(body.from ?? existing.from).trim() || existing.from,
      nocMailbox: String(body.nocMailbox ?? existing.nocMailbox).trim() || existing.nocMailbox,
      extraNotificationEmails: Array.isArray(body.extraNotificationEmails)
        ? body.extraNotificationEmails.map((e: unknown) => String(e).trim()).filter(Boolean)
        : existing.extraNotificationEmails,
      testEnabled: Boolean(body.testEnabled ?? existing.testEnabled),
    };

    await writeStore(next);
    return NextResponse.json({ success: true, settings: sanitize(next) });
  } catch (error) {
    console.error('[smtp-settings PUT]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** POST /api/system/smtp-settings/test — send a test email using current settings. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ok = await requireAdmin(req);
    if (!ok) return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });

    const stored = await readStore();
    const to = String(body?.to ?? stored.nocMailbox).trim();

    if (!to) return NextResponse.json({ error: 'Destinataire requis' }, { status: 400 });

    const transporter = nodemailer.createTransport({
      host: stored.host,
      port: stored.port,
      secure: stored.secure,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      ...(stored.user && stored.pass ? { auth: { user: stored.user, pass: stored.pass } } : {}),
    });

    await transporter.sendMail({
      from: stored.from,
      to,
      subject: '[TEST SMTP] Configuration NOC Activities',
      text: `Test de configuration SMTP NOC Activities.\n\nServeur: ${stored.host}:${stored.port}\nDepuis: ${stored.from}\nBoite NOC: ${stored.nocMailbox}\n\nSi vous recevez ce message, la configuration SMTP fonctionne correctement.`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:600px;">
          <h2 style="margin:0 0 12px;color:#1d4ed8;">Test SMTP — NOC Activities</h2>
          <p>Ce message confirme que la configuration SMTP fonctionne correctement.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:6px 12px;background:#f1f5f9;font-weight:bold;">Serveur</td><td style="padding:6px 12px;">${stored.host}:${stored.port}</td></tr>
            <tr><td style="padding:6px 12px;background:#f1f5f9;font-weight:bold;">Sécurisé (TLS)</td><td style="padding:6px 12px;">${stored.secure ? 'Oui' : 'Non'}</td></tr>
            <tr><td style="padding:6px 12px;background:#f1f5f9;font-weight:bold;">Expéditeur</td><td style="padding:6px 12px;">${stored.from}</td></tr>
            <tr><td style="padding:6px 12px;background:#f1f5f9;font-weight:bold;">Boîte NOC</td><td style="padding:6px 12px;">${stored.nocMailbox}</td></tr>
            <tr><td style="padding:6px 12px;background:#f1f5f9;font-weight:bold;">Mode</td><td style="padding:6px 12px;">${stored.user ? 'Authentifié (Gmail)' : 'Relais local (Postfix)'}</td></tr>
          </table>
          <p style="color:#64748b;font-size:13px;">Message envoyé automatiquement par NOC Activities.</p>
        </div>
      `,
    });

    return NextResponse.json({
      ok: true,
      to,
      host: stored.host,
      port: stored.port,
      mode: stored.user ? 'auth' : 'local_no_auth',
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Envoi SMTP échoué',
    }, { status: 500 });
  }
}
