import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { addDays, format, startOfMonth, endOfMonth, getDay, isToday, parseISO, isSameDay, getHours } from 'date-fns';

const prisma = new PrismaClient();

// Initial conditions for February 2026
const INITIAL_SHIFT_START: Record<string, Date> = {
  'A': new Date('2026-02-24T07:00:00'), // Shift A starts Feb 24, 2026 at 07h
  'B': new Date('2026-02-21T07:00:00'), // Shift B starts Feb 21, 2026
  'C': new Date('2026-02-18T07:00:00'), // Shift C starts Feb 18, 2026
};

// Cycle duration: 6 work days + 3 rest days = 9 days total
const CYCLE_WORK_DAYS = 6;
const CYCLE_REST_DAYS = 3;
const CYCLE_TOTAL_DAYS = CYCLE_WORK_DAYS + CYCLE_REST_DAYS;

interface ShiftSchedule {
  shiftId: string;
  shiftName: string;
  shiftColor: string;
  shiftColorCode: string;
  date: Date;
  dayType: 'DAY_SHIFT' | 'NIGHT_SHIFT' | 'REST_DAY';
  dayNumber: number;
}

function calculateShiftSchedules(startDate: Date, daysToCalculate: number): ShiftSchedule[] {
  const schedules: ShiftSchedule[] = [];
  
  // Calculate which 9-day cycle position we're in
  for (let i = 0; i < daysToCalculate; i++) {
    const currentDate = addDays(startDate, i);
    const cyclePosition = i % CYCLE_TOTAL_DAYS;
    
    let dayType: 'DAY_SHIFT' | 'NIGHT_SHIFT' | 'REST_DAY';
    let dayNumber = 0;
    
    if (cyclePosition < 3) {
      // Days 1-3: Day shift (07h-19h)
      dayType = 'DAY_SHIFT';
      dayNumber = cyclePosition + 1;
    } else if (cyclePosition < 6) {
      // Days 4-6: Night shift (19h-07h)
      dayType = 'NIGHT_SHIFT';
      dayNumber = cyclePosition + 1;
    } else {
      // Days 7-9: Rest
      dayType = 'REST_DAY';
      dayNumber = 0;
    }
    
    schedules.push({
      shiftId: '',
      shiftName: '',
      shiftColor: '',
      shiftColorCode: '',
      date: currentDate,
      dayType,
      dayNumber
    });
  }
  
  return schedules;
}

function getShiftScheduleForDate(shiftName: string, targetDate: Date): { 
  dayType: 'DAY_SHIFT' | 'NIGHT_SHIFT' | 'REST_DAY'; 
  dayNumber: number;
  cycleNumber: number;
} {
  const startDate = INITIAL_SHIFT_START[shiftName];
  
  if (!startDate || targetDate < startDate) {
    // Before start date - consider as rest
    return { dayType: 'REST_DAY', dayNumber: 0, cycleNumber: 0 };
  }
  
  // Calculate days since start
  const daysDiff = Math.floor((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate which 9-day cycle we're in
  const cycleNumber = Math.floor(daysDiff / CYCLE_TOTAL_DAYS) + 1;
  const cyclePosition = daysDiff % CYCLE_TOTAL_DAYS;
  
  let dayType: 'DAY_SHIFT' | 'NIGHT_SHIFT' | 'REST_DAY';
  let dayNumber = 0;
  
  if (cyclePosition < 3) {
    dayType = 'DAY_SHIFT';
    dayNumber = cyclePosition + 1;
  } else if (cyclePosition < 6) {
    dayType = 'NIGHT_SHIFT';
    dayNumber = cyclePosition + 1;
  } else {
    dayType = 'REST_DAY';
    dayNumber = 0;
  }
  
  return { dayType, dayNumber, cycleNumber };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    // Get all shifts with members
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

    // Calculate planning for the month
    const monthStart = startOfMonth(new Date(year, month - 1, 1));
    const monthEnd = endOfMonth(monthStart);
    
    const planning: Array<{
      date: string;
      dayOfWeek: number;
      dayName: string;
      isToday: boolean;
      shifts: Array<{
        shiftId: string;
        shiftName: string;
        shiftColor: string;
        shiftColorCode: string;
        dayType: 'DAY_SHIFT' | 'NIGHT_SHIFT' | 'REST_DAY';
        dayNumber: number;
        agents: Array<{
          id: string;
          name: string;
          responsibility?: string;
          isResting: boolean;
        }>;
      }>;
    }> = [];

    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    
    // Individual rest rotation tracking per shift
    const restRotationPosition: Record<string, number> = {};
    shifts.forEach(shift => {
      restRotationPosition[shift.name] = 0;
    });

    for (let d = monthStart; d <= monthEnd; d = addDays(d, 1)) {
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayOfWeek = getDay(d);
      const dayName = dayNames[dayOfWeek];
      
      const dayShifts = shifts.map(shift => {
        const schedule = getShiftScheduleForDate(shift.name, d);
        
        // Calculate individual rest rotations
        // Starting from day 3 of cycle, agents rotate rest on days 4, 5, 6
        let agents = shift.members.map((member, idx) => {
          let isResting = false;
          let responsibility: string | undefined;
          
          // Only on work days, check for individual rest
          if (schedule.dayType !== 'REST_DAY' && schedule.dayNumber >= 4) {
            // Days 4, 5, 6 have individual rest rotation
            const restDay = schedule.dayNumber - 3; // 1, 2, or 3 for resting agent
            const cycleStart = new Date(INITIAL_SHIFT_START[shift.name]);
            const daysSinceStart = Math.floor((d.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
            const currentCycle = Math.floor(daysSinceStart / CYCLE_TOTAL_DAYS);
            
            // Rotating position based on cycle
            const restingAgentIndex = (currentCycle * 3 + restDay - 1) % shift.members.length;
            isResting = idx === restingAgentIndex;
          }
          
          // Assign responsibilities for non-resting agents
          if (!isResting && schedule.dayType !== 'REST_DAY') {
            const responsibilities = ['CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2'];
            const activeAgents = shift.members.filter((_, i) => {
              if (schedule.dayNumber >= 4) {
                const restDay = schedule.dayNumber - 3;
                const cycleStart = new Date(INITIAL_SHIFT_START[shift.name]);
                const daysSinceStart = Math.floor((d.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
                const currentCycle = Math.floor(daysSinceStart / CYCLE_TOTAL_DAYS);
                const restingAgentIndex = (currentCycle * 3 + restDay - 1) % shift.members.length;
                return i !== restingAgentIndex;
              }
              return true;
            });
            
            const activeIdx = activeAgents.findIndex(a => a.id === member.id);
            if (activeIdx !== -1 && activeIdx < responsibilities.length) {
              responsibility = responsibilities[activeIdx];
            }
          }
          
          return {
            id: member.id,
            name: member.name,
            responsibility,
            isResting
          };
        });
        
        return {
          shiftId: shift.id,
          shiftName: shift.name,
          shiftColor: shift.color,
          shiftColorCode: shift.colorCode,
          dayType: schedule.dayType,
          dayNumber: schedule.dayNumber,
          agents
        };
      });
      
      planning.push({
        date: dateStr,
        dayOfWeek,
        dayName,
        isToday: isToday(d),
        shifts: dayShifts
      });
    }

    return NextResponse.json({
      success: true,
      planning,
      month,
      year
    });
  } catch (error) {
    console.error('Error generating planning:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur lors de la génération du planning' 
    }, { status: 500 });
  }
}
