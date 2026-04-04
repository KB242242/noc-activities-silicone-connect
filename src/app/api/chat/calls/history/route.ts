/* API pour l'historique des appels */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const dbAny = db as any;

export async function POST(request: NextRequest) {
  try {
    const {
      conversationId,
      callType,
      startTime,
      endTime,
      participantIds = [],
      recordingUrl,
      notes,
      meetingId,
    } = await request.json();

    if (!conversationId || !callType || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants' },
        { status: 400 }
      );
    }

    const duration = Math.floor((endTime - startTime) / 1000); // en secondes

    const callHistory = await dbAny.callHistory.create({
      data: {
        conversationId,
        callType,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration,
        participantIds: JSON.stringify(participantIds),
        recordingUrl,
        notes,
        meetingId,
      },
    });

    return NextResponse.json({
      success: true,
      callHistory: {
        id: callHistory.id,
        conversationId: callHistory.conversationId,
        callType: callHistory.callType,
        startTime: callHistory.startTime.getTime(),
        endTime: callHistory.endTime.getTime(),
        duration: callHistory.duration,
        participantIds: JSON.parse(callHistory.participantIds),
        recordingUrl: callHistory.recordingUrl,
        notes: callHistory.notes,
      },
    });
  } catch (error) {
    console.error('Erreur enregistrement appel:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId requis' },
        { status: 400 }
      );
    }

    const callHistories = await dbAny.callHistory.findMany({
      where: { conversationId },
      orderBy: { startTime: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await dbAny.callHistory.count({
      where: { conversationId },
    });

    return NextResponse.json({
      success: true,
      total,
      callHistories: callHistories.map((ch) => ({
        id: ch.id,
        conversationId: ch.conversationId,
        callType: ch.callType,
        startTime: ch.startTime.getTime(),
        endTime: ch.endTime.getTime(),
        duration: ch.duration,
        participantCount: JSON.parse(ch.participantIds).length,
        participantIds: JSON.parse(ch.participantIds),
        recordingUrl: ch.recordingUrl,
        notes: ch.notes,
      })),
    });
  } catch (error) {
    console.error('Erreur fetch historique appels:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
