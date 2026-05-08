/**
 * Twilio Voice Webhook
 *
 * Configure dans Twilio Console → Phone Numbers → ton numéro → Voice :
 *   Webhook URL : https://ton-domaine.com/api/noc/callcenter/twilio/webhook
 *   Method : POST
 *
 * Ce endpoint :
 * 1. Reçoit l'appel entrant de Twilio
 * 2. L'enregistre dans noc_callcenter_calls via l'ingest interne
 * 3. Répond avec un TwiML qui met l'appel en file d'attente (Queue)
 *    → l'agent peut ensuite "décrocher" depuis le panel NOC
 */

import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { db } from '@/lib/db';

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const QUEUE_NAME = process.env.TWILIO_QUEUE_NAME || 'noc-queue';

function buildTwiML(action: 'enqueue' | 'reject'): string {
  if (action === 'reject') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Reject reason="busy"/>
</Response>`;
  }

  // Enqueue l'appel dans la file NOC — l'agent décroche depuis le panel
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR">Bienvenue au centre d'assistance Silicone Connect. Veuillez patienter, un agent va vous répondre.</Say>
  <Enqueue waitUrl="/api/noc/callcenter/twilio/queue-wait">${QUEUE_NAME}</Enqueue>
</Response>`;
}

export async function POST(request: NextRequest) {
  // Vérifier la signature Twilio pour sécuriser le webhook
  if (ACCOUNT_SID && AUTH_TOKEN) {
    const signature = request.headers.get('X-Twilio-Signature') || '';
    const url = process.env.NEXT_PUBLIC_BASE_URL
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/noc/callcenter/twilio/webhook`
      : `https://${request.headers.get('host')}/api/noc/callcenter/twilio/webhook`;

    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = String(value);
    });

    const isValid = twilio.validateRequest(AUTH_TOKEN, signature, url, params);
    if (!isValid) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    // Extraire les données de l'appel Twilio
    const callSid = params.CallSid || '';
    const from = params.From || '';
    const to = params.To || '';
    const callStatus = params.CallStatus || 'ringing';

    let dbStatus: 'RINGING' | 'IN_PROGRESS' | 'MISSED' | 'DONE' = 'RINGING';
    if (callStatus === 'in-progress') dbStatus = 'IN_PROGRESS';
    else if (callStatus === 'completed') dbStatus = 'DONE';
    else if (callStatus === 'no-answer' || callStatus === 'failed') dbStatus = 'MISSED';

    // Chercher si l'appel existe déjà (par CallSid)
    const existing = await db.$queryRaw<{ id: bigint }[]>`
      SELECT id FROM noc_callcenter_calls WHERE external_call_id = ${callSid} LIMIT 1
    `;

    if (existing.length > 0) {
      await db.$executeRaw`
        UPDATE noc_callcenter_calls
        SET status = ${dbStatus}, updated_at = NOW()
        WHERE id = ${existing[0].id}
      `;
    } else {
      await db.$executeRaw`
        INSERT INTO noc_callcenter_calls (
          customer_name, customer_phone, line_number, direction, priority, status, reason, external_call_id, created_at, updated_at
        ) VALUES (
          ${'Appel Twilio'}, ${from}, ${to}, ${'INCOMING'}, ${'HIGH'}, ${dbStatus},
          ${'Appel entrant Twilio'}, ${callSid}, NOW(), NOW()
        )
      `;
    }

    const twiml = buildTwiML('enqueue');
    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }

  // Mode dev sans credentials Twilio : réponse TwiML de test
  const twiml = buildTwiML('enqueue');
  return new NextResponse(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

// GET pour vérifier que le webhook est actif
export async function GET() {
  return NextResponse.json({ status: 'Twilio webhook actif', queue: QUEUE_NAME });
}
