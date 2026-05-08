/**
 * TwiML de musique d'attente pendant que l'appel est en file
 * Twilio l'appelle automatiquement tant que l'appelant attend
 */
import { NextResponse } from 'next/server';

export async function GET() {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR">Votre appel est important. Veuillez patienter, un agent va vous répondre dans quelques instants.</Say>
  <Play loop="3">https://demo.twilio.com/docs/classic.mp3</Play>
</Response>`;

  return new NextResponse(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

export async function POST() {
  return GET();
}
