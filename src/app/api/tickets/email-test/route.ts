import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

import { sendTicketLifecycleEmail } from '@/lib/tickets/emailNotifications';

function getSmtpStatus() {
  const host = String(process.env.SMTP_HOST ?? 'localhost').trim() || 'localhost';
  const port = String(process.env.SMTP_PORT ?? '25').trim();
  const user = String(process.env.SMTP_USER ?? '').trim();
  const pass = String(process.env.SMTP_PASS ?? '').trim();
  const from = String(process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noc@siliconeconnect.local').trim();
  const secure = String(process.env.SMTP_SECURE ?? 'false').trim().toLowerCase() === 'true';

  return {
    configured: Boolean(host),
    mode: user && pass ? 'auth' : 'local_no_auth',
    host: host || null,
    port,
    secure,
    user: user || null,
    from: from || null,
  };
}

async function readEnvLocalPassMeta() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const raw = await fs.readFile(envPath, 'utf8');
    const line = raw
      .split(/\r?\n/)
      .find((entry) => entry.trimStart().startsWith('SMTP_PASS='));

    if (!line) {
      return {
        envPath,
        hasLine: false,
        hasValue: false,
        length: 0,
      };
    }

    const value = line.replace(/^\s*SMTP_PASS\s*=\s*/, '').trim();
    return {
      envPath,
      hasLine: true,
      hasValue: value.length > 0,
      length: value.length,
    };
  } catch {
    return {
      envPath: path.join(process.cwd(), '.env.local'),
      hasLine: false,
      hasValue: false,
      length: 0,
    };
  }
}

export async function GET() {
  const smtp = getSmtpStatus();
  const envLocalPassMeta = await readEnvLocalPassMeta();

  return NextResponse.json({
    ok: true,
    smtp,
    debug: {
      cwd: process.cwd(),
      processEnvPassPresent: Boolean(String(process.env.SMTP_PASS ?? '').trim()),
      processEnvPassLength: String(process.env.SMTP_PASS ?? '').trim().length,
      envLocalPassMeta,
    },
    message: smtp.mode === 'local_no_auth'
      ? 'SMTP en mode Postfix local (sans auth). Vous pouvez lancer un test par POST.'
      : 'SMTP en mode authentifie. Vous pouvez lancer un test par POST.',
  });
}

export async function POST(request: NextRequest) {
  const smtp = getSmtpStatus();
  if (!smtp.configured) {
    return NextResponse.json(
      {
        ok: false,
        smtp,
        error: 'SMTP tickets non configure',
      },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  // This test uses the same transport settings as real ticket notifications.
  const receiver = String(body?.to ?? body?.receiver ?? process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noc@siliconeconnect.local').trim();

  if (!receiver) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Destinataire requis',
      },
      { status: 400 }
    );
  }

  const sent = await sendTicketLifecycleEmail({
    action: 'created',
    ticketNumber: '#SMTP-TEST-001',
    subject: 'Test notification tickets Postfix local',
    status: 'OPEN',
    creatorName: 'Diagnostic SMTP',
    receiver,
    subjectOverride: '[TEST SMTP] Notification tickets Postfix local',
    customMessage: 'Si vous recevez cet email, la configuration SMTP locale (Postfix) du module tickets fonctionne correctement.',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">Test SMTP Tickets</h2>
        <p>Ce message confirme que l'envoi email du module tickets fonctionne.</p>
        <p><strong>Destinataire :</strong> ${receiver}</p>
        <p><strong>Serveur :</strong> ${smtp.host}:${smtp.port}</p>
      </div>
    `,
  });

  if (!sent) {
    return NextResponse.json(
      {
        ok: false,
        smtp,
        error: 'Echec envoi SMTP',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    smtp,
    receiver,
    message: 'Email de test envoye',
  });
}
