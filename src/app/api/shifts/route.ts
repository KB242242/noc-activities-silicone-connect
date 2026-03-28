import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const shifts = await prisma.shift.findMany({
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true
          },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      shifts: shifts.map(shift => ({
        id: shift.id,
        name: shift.name,
        color: shift.color,
        colorCode: shift.colorCode,
        members: shift.members
      }))
    });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur lors de la récupération des shifts' 
    }, { status: 500 });
  }
}
