import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTicketManagerFromActorId } from '@/lib/tickets/permissions';
import { sendTicketLifecycleEmail } from '@/lib/tickets/emailNotifications';

// API pour l'envoi d'emails de notification de tickets
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, content, html, text, ticketId, ticketData, requesterId } = body;
    const normalizedText = String(text ?? content ?? '').trim();
    const normalizedHtml = String(html ?? '').trim();
    const normalizedContent = normalizedText || normalizedHtml;

    const normalizedRequesterId = String(requesterId ?? '').trim();
    if (!normalizedRequesterId) {
      return NextResponse.json(
        { error: 'Utilisateur requis' },
        { status: 400 }
      );
    }

    const actorAccess = await resolveTicketManagerFromActorId(db, normalizedRequesterId);
    if (!actorAccess.canManage) {
      return NextResponse.json(
        { error: 'Acces refuse' },
        { status: 403 }
      );
    }

    // Validation des données
    if (!to || !subject || !normalizedContent) {
      return NextResponse.json(
        { error: 'Destinataire, sujet et contenu requis' },
        { status: 400 }
      );
    }

    const sent = await sendTicketLifecycleEmail({
      action: (ticketData?.action as any) ?? 'created',
      ticketNumber: String(ticketData?.ticketNumber ?? ''),
      subject: String(subject ?? ''),
      status: String(ticketData?.status ?? ''),
      receiver: String(to),
      htmlBody: normalizedHtml || undefined,
      textBody: normalizedText || undefined,
      subjectOverride: String(subject ?? ''),
    });

    if (!sent) {
      return NextResponse.json(
        { error: 'Envoi SMTP echoue ou serveur mail injoignable. Verifiez votre service SMTP/Postfix local et les variables SMTP_*.' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email envoyé avec succès',
      sentTo: to,
      ticketId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    );
  }
}

// API pour générer un rapport PDF de tickets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const technician = searchParams.get('technician');
    const site = searchParams.get('site');
    const ticketType = searchParams.get('ticketType');

    // Retourner les paramètres de rapport pour que le frontend puisse générer le PDF
    return NextResponse.json({
      reportParams: {
        type: reportType,
        startDate,
        endDate,
        technician,
        site,
        ticketType,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erreur lors de la génération du rapport:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du rapport' },
      { status: 500 }
    );
  }
}
