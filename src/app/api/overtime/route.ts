import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getHours, parseISO, addMonths, subMonths } from 'date-fns';

const prisma = new PrismaClient();

// Initial conditions for February 2026
const INITIAL_SHIFT_START: Record<string, Date> = {
  'A': new Date('2026-02-24T07:00:00'),
  'B': new Date('2026-02-21T07:00:00'),
  'C': new Date('2026-02-18T07:00:00'),
};

const CYCLE_TOTAL_DAYS = 9;
const CYCLE_WORK_DAYS = 6;

function getShiftScheduleForDate(shiftName: string, targetDate: Date): { 
  dayType: 'DAY_SHIFT' | 'NIGHT_SHIFT' | 'REST_DAY'; 
  dayNumber: number;
} {
  const startDate = INITIAL_SHIFT_START[shiftName];
  
  if (!startDate || targetDate < startDate) {
    return { dayType: 'REST_DAY', dayNumber: 0 };
  }
  
  const daysDiff = Math.floor((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const cyclePosition = daysDiff % CYCLE_TOTAL_DAYS;
  
  if (cyclePosition < 3) {
    return { dayType: 'DAY_SHIFT', dayNumber: cyclePosition + 1 };
  } else if (cyclePosition < 6) {
    return { dayType: 'NIGHT_SHIFT', dayNumber: cyclePosition + 1 };
  }
  
  return { dayType: 'REST_DAY', dayNumber: 0 };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'UserId requis' 
      }, { status: 400 });
    }

    // Get user with shift info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { shift: true }
    });

    if (!user || !user.shift) {
      return NextResponse.json({ 
        success: false, 
        error: 'Utilisateur non trouvé ou sans shift assigné' 
      }, { status: 404 });
    }

    // Calculate overtime for the month
    const monthStart = startOfMonth(new Date(year, month - 1, 1));
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const overtimeRecords: Array<{
      date: string;
      dayOfWeek: string;
      dayType: 'DAY_SHIFT' | 'NIGHT_SHIFT';
      duration: number;
      startTime: string;
      endTime: string;
    }> = [];

    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    for (const day of days) {
      const schedule = getShiftScheduleForDate(user.shift!.name, day);
      
      if (schedule.dayType !== 'REST_DAY') {
        const isDayShift = schedule.dayType === 'DAY_SHIFT';
        
        overtimeRecords.push({
          date: format(day, 'yyyy-MM-dd'),
          dayOfWeek: dayNames[day.getDay()],
          dayType: schedule.dayType,
          duration: 120, // Always 2 hours
          startTime: isDayShift ? '07:00' : '18:00',
          endTime: isDayShift ? '08:00\n18:00' : '19:00\n06:00'
        });
      }
    }

    // Get existing overtime records from DB
    const existingOvertime = await prisma.overtime.findMany({
      where: {
        userId,
        month,
        year
      }
    });

    // Create overtime records if not exist
    for (const record of overtimeRecords) {
      const exists = existingOvertime.find(e => e.date.toISOString().split('T')[0] === record.date);
      
      if (!exists) {
        await prisma.overtime.create({
          data: {
            userId,
            date: parseISO(record.date),
            duration: record.duration,
            shiftType: record.dayType === 'DAY_SHIFT' ? 'jour' : 'nuit',
            month,
            year
          }
        });
      }
    }

    // Get final overtime records
    const allOvertime = await prisma.overtime.findMany({
      where: {
        userId,
        month,
        year
      },
      orderBy: { date: 'asc' }
    });

    const totalMinutes = allOvertime.reduce((sum, o) => sum + o.duration, 0);
    const totalHours = totalMinutes / 60;

    return NextResponse.json({
      success: true,
      overtime: {
        userId: user.id,
        userName: user.name,
        shiftName: user.shift.name,
        month,
        year,
        records: allOvertime.map(o => ({
          date: o.date.toISOString().split('T')[0],
          dayOfWeek: dayNames[o.date.getDay()],
          dayType: o.shiftType === 'jour' ? 'DAY_SHIFT' : 'NIGHT_SHIFT',
          duration: o.duration,
          startTime: o.shiftType === 'jour' ? '07:00 - 08:00\n18:00 - 19:00' : '18:00 - 19:00\n06:00 - 07:00',
          approvedBy: o.approvedBy,
          reason: o.reason
        })),
        totalMinutes,
        totalHours,
        totalDays: allOvertime.length
      }
    });
  } catch (error) {
    console.error('Error calculating overtime:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur lors du calcul des heures supplémentaires' 
    }, { status: 500 });
  }
}
