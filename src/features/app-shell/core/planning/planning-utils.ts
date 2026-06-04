import { addDays, eachDayOfInterval, endOfMonth, startOfMonth } from 'date-fns';

import { CYCLE_TOTAL_DAYS, SHIFT_CYCLE_START, SHIFTS_DATA } from '@/features/app-shell/core/planning/shifts';
import type { DayType, ResponsibilityType } from '@/features/app-shell/core/shared/types';

type ShiftSchedule = {
  dayType: DayType;
  dayNumber: number;
  cycleNumber: number;
  isWorking: boolean;
  isCollectiveRest: boolean;
};

export function getShiftScheduleForDate(shiftName: string, targetDate: Date): ShiftSchedule {
  const startDate = SHIFT_CYCLE_START[shiftName];
  if (!startDate) {
    return { dayType: 'REST_DAY', dayNumber: 0, cycleNumber: 0, isWorking: false, isCollectiveRest: true };
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.floor((targetDate.getTime() - startDate.getTime()) / msPerDay);

  if (daysDiff < 0) {
    const cyclesBack = Math.ceil(Math.abs(daysDiff) / CYCLE_TOTAL_DAYS);
    const adjustedDaysDiff = daysDiff + (cyclesBack * CYCLE_TOTAL_DAYS);
    const cyclePosition = ((adjustedDaysDiff % CYCLE_TOTAL_DAYS) + CYCLE_TOTAL_DAYS) % CYCLE_TOTAL_DAYS;
    return getScheduleFromPosition(cyclePosition, 0);
  }

  const cycleNumber = Math.floor(daysDiff / CYCLE_TOTAL_DAYS) + 1;
  const cyclePosition = daysDiff % CYCLE_TOTAL_DAYS;

  return getScheduleFromPosition(cyclePosition, cycleNumber);
}

export function getScheduleFromPosition(cyclePosition: number, cycleNumber: number): ShiftSchedule {
  if (cyclePosition < 3) {
    return { dayType: 'DAY_SHIFT', dayNumber: cyclePosition + 1, cycleNumber, isWorking: true, isCollectiveRest: false };
  }
  if (cyclePosition < 6) {
    return { dayType: 'NIGHT_SHIFT', dayNumber: cyclePosition + 1, cycleNumber, isWorking: true, isCollectiveRest: false };
  }
  return { dayType: 'REST_DAY', dayNumber: 0, cycleNumber, isWorking: false, isCollectiveRest: true };
}

export function getIndividualRestAgent(
  shiftName: string,
  targetDate: Date
): { agentIndex: number; agentName: string } | null {
  const schedule = getShiftScheduleForDate(shiftName, targetDate);
  const shiftData = SHIFTS_DATA[shiftName];

  if (!shiftData || schedule.isCollectiveRest || schedule.dayNumber < 3 || schedule.dayNumber > 6) {
    return null;
  }

  const members = shiftData.members;
  const agentIndex = schedule.dayNumber - 3;

  if (agentIndex < 0 || agentIndex >= members.length) return null;

  return { agentIndex, agentName: members[agentIndex] };
}

export function getAgentRestInfo(agentName: string, shiftName: string, targetDate: Date) {
  const schedule = getShiftScheduleForDate(shiftName, targetDate);
  const shiftData = SHIFTS_DATA[shiftName];

  if (!shiftData) {
    return { isOnIndividualRest: false, isOnCollectiveRest: true, nextIndividualRest: null, nextCollectiveRestStart: null };
  }

  let isOnIndividualRest = false;

  if (schedule.isWorking && schedule.dayNumber >= 3) {
    const restInfo = getIndividualRestAgent(shiftName, targetDate);
    if (restInfo && restInfo.agentName === agentName) {
      isOnIndividualRest = true;
    }
  }

  let nextIndividualRest: Date | null = null;
  let searchDate = addDays(targetDate, 1);

  for (let i = 0; i < 30; i++) {
    const restInfo = getIndividualRestAgent(shiftName, searchDate);
    if (restInfo && restInfo.agentName === agentName) {
      nextIndividualRest = searchDate;
      break;
    }
    searchDate = addDays(searchDate, 1);
  }

  let nextCollectiveRestStart: Date | null = null;
  searchDate = targetDate;

  for (let i = 0; i < CYCLE_TOTAL_DAYS; i++) {
    const searchSchedule = getShiftScheduleForDate(shiftName, searchDate);
    if (searchSchedule.isCollectiveRest) {
      nextCollectiveRestStart = searchDate;
      break;
    }
    searchDate = addDays(searchDate, 1);
  }

  return {
    isOnIndividualRest,
    isOnCollectiveRest: schedule.isCollectiveRest,
    nextIndividualRest,
    nextCollectiveRestStart,
  };
}

export function buildMonthlyPlanning(currentMonth: Date) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return days.map((targetDate) => {
    const shifts = Object.keys(SHIFTS_DATA).map((shiftName) => {
      const shiftData = SHIFTS_DATA[shiftName];
      const schedule = getShiftScheduleForDate(shiftName, targetDate);
      const restInfo = getIndividualRestAgent(shiftName, targetDate);

      const agents = shiftData.members.map((memberName) => {
        const isResting = restInfo?.agentName === memberName;
        let responsibility: ResponsibilityType | undefined;

        if (schedule.isWorking && !isResting) {
          const activeAgents = shiftData.members.filter((member) => member !== restInfo?.agentName);
          const activeIdx = activeAgents.indexOf(memberName);
          const responsibilities: ResponsibilityType[] = ['CALL_CENTER', 'MONITORING', 'REPORTING_1', 'REPORTING_2'];
          responsibility = responsibilities[activeIdx] || undefined;
        }

        return { name: memberName, isResting, responsibility };
      });

      return { shiftName, ...shiftData, schedule, agents, restInfo };
    });

    return { date: targetDate, shifts };
  });
}