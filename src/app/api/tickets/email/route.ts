import { NextRequest, NextResponse } from 'next/server';

// API pour l'envoi d'emails de notification de tickets
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, content, ticketId, ticketData } = body;

    // Validation des données
    if (!to || !subject || !content) {
      return NextResponse.json(
        { error: 'Destinataire, sujet et contenu requis' },
        { status: 400 }
      );
    }

    // Dans un environnement de production, on utiliserait un service d'envoi d'email
    // comme SendGrid, Mailgun, ou un serveur SMTP
    // Pour cette démo, on simule l'envoi et on log les informations
    
    console.log('========================================');
    console.log('EMAIL DE NOTIFICATION DE TICKET');
    console.log('========================================');
    console.log(`À: ${to}`);
    console.log(`Sujet: ${subject}`);
    console.log('--- Contenu ---');
    console.log(content);
    console.log('========================================');

    // Simuler un délai d'envoi
    await new Promise(resolve => setTimeout(resolve, 500));

    // En production, le code ressemblerait à ceci:
    /*
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }], subject }],
        from: { email: 'noreply@siliconeconnect.com', name: 'NOC Silicone Connect' },
        content: [{ type: 'text/plain', value: content }],
      }),
    });
    */

    return NextResponse.json({
      success: true,
      message: 'Email envoyé avec succès',
      sentTo: to,
      ticketId,
      timestamp: new Date().toISOString()
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
