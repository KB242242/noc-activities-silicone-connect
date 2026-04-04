/* API pour planifier une réunion vidéo */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

const dbAny = db as any;

export async function POST(request: NextRequest) {
  try {
    const {
      title,
      description,
      conversationId,
      organizerId,
      scheduledStartTime,
      scheduledEndTime,
      callType = 'video',
      allowScreenShare = true,
      allowRecording = false,
      participantIds = [],
    } = await request.json();

    if (!title || !conversationId || !organizerId || !scheduledStartTime || !scheduledEndTime) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants' },
        { status: 400 }
      );
    }

    // Vérifier que l'organisateur est participant de la conversation
    const participant = await db.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: organizerId,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Organisateur non participant de la conversation' },
        { status: 403 }
      );
    }

    // Créer la réunion planifiée
    const meeting = await dbAny.scheduledMeeting.create({
      data: {
        title,
        description,
        conversationId,
        organizerId,
        scheduledStartTime: new Date(scheduledStartTime),
        scheduledEndTime: new Date(scheduledEndTime),
        callType,
        allowScreenShare,
        allowRecording,
        status: 'scheduled',
        participants: {
          create: [
            // Ajouter l'organisateur
            {
              userId: organizerId,
              status: 'accepted',
            },
            // Ajouter les autres participants
            ...participantIds.map((userId: string) => ({
              userId,
              status: 'invited',
            })),
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
        organizer: true,
      },
    });

    // Créer un lien de réunion
    const meetingLink = `${process.env.NEXT_PUBLIC_APP_URL}/meetings/${meeting.id}`;

    // Mettre à jour la réunion avec le lien
    const updatedMeeting = await dbAny.scheduledMeeting.update({
      where: { id: meeting.id },
      data: { meetingLink },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
        organizer: true,
      },
    });

    // TODO: Envoyer des notifications aux participants

    return NextResponse.json({
      success: true,
      meeting: {
        id: updatedMeeting.id,
        title: updatedMeeting.title,
        description: updatedMeeting.description,
        conversationId: updatedMeeting.conversationId,
        organizerId: updatedMeeting.organizerId,
        scheduledStartTime: updatedMeeting.scheduledStartTime.getTime(),
        scheduledEndTime: updatedMeeting.scheduledEndTime.getTime(),
        callType: updatedMeeting.callType,
        meetingLink: updatedMeeting.meetingLink,
        allowScreenShare: updatedMeeting.allowScreenShare,
        allowRecording: updatedMeeting.allowRecording,
        status: updatedMeeting.status,
        participants: updatedMeeting.participants.map((p) => ({
          userId: p.userId,
          name: p.user.name,
          email: p.user.email,
          status: p.status,
          joinedAt: p.joinedAt?.getTime(),
        })),
      },
    });
  } catch (error) {
    console.error('Erreur planification réunion:', error);
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

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId requis' },
        { status: 400 }
      );
    }

    const meetings = await dbAny.scheduledMeeting.findMany({
      where: { conversationId },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
        organizer: true,
      },
      orderBy: { scheduledStartTime: 'desc' },
    });

    return NextResponse.json({
      success: true,
      meetings: meetings.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        conversationId: m.conversationId,
        organizerId: m.organizerId,
        organizerName: m.organizer.name,
        scheduledStartTime: m.scheduledStartTime.getTime(),
        scheduledEndTime: m.scheduledEndTime.getTime(),
        callType: m.callType,
        meetingLink: m.meetingLink,
        allowScreenShare: m.allowScreenShare,
        allowRecording: m.allowRecording,
        status: m.status,
        participants: m.participants.map((p) => ({
          userId: p.userId,
          name: p.user.name,
          email: p.user.email,
          status: p.status,
          joinedAt: p.joinedAt?.getTime(),
        })),
      })),
    });
  } catch (error) {
    console.error('Erreur fetch réunions:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
