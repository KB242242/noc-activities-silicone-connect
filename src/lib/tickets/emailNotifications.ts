import nodemailer from 'nodemailer';

type TicketLifecycleInput = {
  action: 'created' | 'closed' | 'trashed' | 'restored' | 'trash_warning' | 'deleted_permanently';
  ticketNumber: string;
  subject: string;
  status: string;
  creatorName?: string | null;
  receiver?: string;
  customMessage?: string;
};

function buildTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true';

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export async function sendTicketLifecycleEmail(input: TicketLifecycleInput) {
  try {
    const transporter = buildTransporter();
    if (!transporter) return false;

    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@siliconeconnect.com';
    const to = input.receiver ?? 'ange.bata@siliconeconnect.com';
    const actionLabelMap: Record<TicketLifecycleInput['action'], string> = {
      created: 'Creation',
      closed: 'Fermeture',
      trashed: 'Corbeille',
      restored: 'Restauration',
      trash_warning: 'Alerte corbeille',
      deleted_permanently: 'Suppression definitive',
    };
    const actionLabel = actionLabelMap[input.action] ?? 'Mise a jour';
    const subject = `[Ticket ${actionLabel}] ${input.ticketNumber} - ${input.subject}`;

    await transporter.sendMail({
      from,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
          <h2 style="margin: 0 0 12px;">Notification ticket</h2>
          <p><strong>Action:</strong> ${actionLabel}</p>
          <p><strong>Numero:</strong> ${input.ticketNumber}</p>
          <p><strong>Objet:</strong> ${input.subject}</p>
          <p><strong>Statut:</strong> ${input.status}</p>
          <p><strong>Cree par:</strong> ${input.creatorName ?? 'N/A'}</p>
          ${input.customMessage ? `<p><strong>Message:</strong> ${input.customMessage}</p>` : ''}
        </div>
      `,
    });

    return true;
  } catch (error) {
    console.error('[ticket email notification]', error);
    return false;
  }
}
