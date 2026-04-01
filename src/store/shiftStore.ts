import { create } from 'zustand';

export interface ShiftInfo {
  id: string;
  name: string;
  color: string;
  colorCode: string;
  members: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

export interface WorkDayInfo {
  id: string;
  date: string;
  dayType: 'DAY_SHIFT' | 'NIGHT_SHIFT' | 'REST_DAY';
  dayNumber: number;
  startHour: number;
  endHour: number;
  assignments: Array<{
    userId: string;
    userName: string;
    responsibility?: string;
    isResting: boolean;
  }>;
}

export interface ShiftCycleInfo {
  id: string;
  shiftId: string;
  shiftName: string;
  shiftColor: string;
  startDate: string;
  endDate: string;
  cycleNumber: number;
  workDays: WorkDayInfo[];
}

export interface PlanningDay {
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
    agents: Array<{
      id: string;
      name: string;
      responsibility?: string;
      isResting: boolean;
    }>;
  }>;
}

interface ShiftState {
  shifts: ShiftInfo[];
  currentCycle: ShiftCycleInfo | null;
  planning: PlanningDay[];
  activeShift: ShiftInfo | null;
  isLoading: boolean;
  
  fetchShifts: () => Promise<void>;
  fetchPlanning: (month: number, year: number) => Promise<void>;
  fetchActiveShift: () => Promise<void>;
  generateCycles: () => Promise<void>;
}

export const useShiftStore = create<ShiftState>((set, get) => ({
  shifts: [],
  currentCycle: null,
  planning: [],
  activeShift: null,
  isLoading: false,
  
  fetchShifts: async () => {
    try {
      set({ isLoading: true });
      const response = await fetch('/api/shifts');
      const data = await response.json();
      
      if (data.success) {
        set({ shifts: data.shifts, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
  
  fetchPlanning: async (month: number, year: number) => {
    try {
      set({ isLoading: true });
      const response = await fetch(`/api/planning?month=${month}&year=${year}`);
      const data = await response.json();
      
      if (data.success) {
        set({ planning: data.planning, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
  
  fetchActiveShift: async () => {
    try {
      const response = await fetch('/api/shifts/active');
      const data = await response.json();
      
      if (data.success) {
        set({ activeShift: data.activeShift });
      }
    } catch {
      // Silent fail
    }
  },
  
  generateCycles: async () => {
    try {
      const response = await fetch('/api/planning/generate', { method: 'POST' });
      const data = await response.json();
      return data;
    } catch {
      return { success: false };
    }
  }
}));
