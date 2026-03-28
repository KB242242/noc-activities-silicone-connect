import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, ActivityType } from '@prisma/client';

const prisma = new PrismaClient();

const ACTIVITY_CATEGORIES: Record<string, ActivityType[]> = {
  'Monitoring': ['CLIENT_DOWN', 'INTERFACE_UNSTABLE', 'RECURRENT_PROBLEM', 'OTHER_MONITORING'],
  'Call Center': ['TICKET_CREATED', 'CLIENT_CALL', 'ESCALATION', 'INCIDENT_FOLLOWUP'],
  'Reporting': ['REPORT_GENERATED', 'HANDOVER_DONE', 'TICKET_CLOSED']
};

function getCategoryForType(type: ActivityType): string {
  for (const [category, types] of Object.entries(ACTIVITY_CATEGORIES)) {
    if (types.includes(type)) return category;
  }
  return 'Other';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where = userId ? { userId } : {};

    const activities = await prisma.activity.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return NextResponse.json({
      success: true,
      activities: activities.map(a => ({
        id: a.id,
        userId: a.userId,
        userName: a.user.name,
        type: a.type,
        category: a.category,
        description: a.description,
        createdAt: a.createdAt.toISOString()
      }))
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur lors de la récupération des activités' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, description } = body;

    if (!userId || !type || !description) {
      return NextResponse.json({ 
        success: false, 
        error: 'Données manquantes' 
      }, { status: 400 });
    }

    const category = getCategoryForType(type as ActivityType);

    const activity = await prisma.activity.create({
      data: {
        userId,
        type: type as ActivityType,
        category,
        description
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      activity: {
        id: activity.id,
        userId: activity.userId,
        userName: activity.user.name,
        type: activity.type,
        category: activity.category,
        description: activity.description,
        createdAt: activity.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur lors de la création de l\'activité' 
    }, { status: 500 });
  }
}
