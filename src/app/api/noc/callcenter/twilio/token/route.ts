/**
 * Génère un Access Token Twilio pour le SDK Voice (navigateur)
 * Le panel NOC appelle ce endpoint pour obtenir un token temporaire
 * et pouvoir décrocher/raccrocher les appels depuis le navigateur
 *
 * Requiert:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_API_KEY      (créer dans Console → API Keys)
 *   TWILIO_API_SECRET   (créer dans Console → API Keys)
 *   TWILIO_TWIML_APP_SID (créer dans Console → TwiML Apps)
 */
import { NextResponse } from 'next/server';
import twilio from 'twilio';

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

export async function GET() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET;
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

  if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
    return NextResponse.json(
      {
        error: 'Twilio non configuré',
        missing: {
          TWILIO_ACCOUNT_SID: !accountSid,
          TWILIO_API_KEY: !apiKey,
          TWILIO_API_SECRET: !apiSecret,
          TWILIO_TWIML_APP_SID: !twimlAppSid,
        },
        help: 'Ajoute ces variables dans ton fichier .env.local',
      },
      { status: 503 }
    );
  }

  const identity = `noc-agent-${Date.now()}`;

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: twimlAppSid,
    incomingAllow: true,
  });

  const token = new AccessToken(accountSid, apiKey, apiSecret, {
    identity,
    ttl: 3600, // 1 heure
  });

  token.addGrant(voiceGrant);

  return NextResponse.json({
    token: token.toJwt(),
    identity,
    ttl: 3600,
  });
}
