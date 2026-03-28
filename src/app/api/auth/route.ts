import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email requis' 
      }, { status: 400 });
    }

    // Validate email domain
    if (!email.endsWith('@siliconeconnect.com')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Seuls les emails @siliconeconnect.com sont autorisés' 
      }, { status: 403 });
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        shift: {
          select: {
            id: true,
            name: true,
            color: true,
            colorCode: true
          }
        }
      }
    });

    if (!user) {
      // Create new user with default AGENT role
      const name = email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
      user = await prisma.user.create({
        data: {
          email,
          name,
          role: 'AGENT',
          isActive: true
        },
        include: {
          shift: {
            select: {
              id: true,
              name: true,
              color: true,
              colorCode: true
            }
          }
        }
      });
    }

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        shiftId: user.shiftId,
        shift: user.shift,
        avatar: user.avatar,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Auth endpoint - POST to login' 
  });
}
