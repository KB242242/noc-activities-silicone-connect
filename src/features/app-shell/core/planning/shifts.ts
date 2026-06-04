export const SHIFT_CYCLE_START: Record<string, Date> = {
  A: new Date('2026-02-24T00:00:00'),
  B: new Date('2026-02-21T00:00:00'),
  C: new Date('2026-02-18T00:00:00'),
};

export const SHIFTS_DATA: Record<string, { name: string; color: string; colorCode: string; members: string[] }> = {
  A: { name: 'Shift A', color: 'blue', colorCode: '#3B82F6', members: ['Luca', 'Alaine', 'Casimir', 'Jose'] },
  B: { name: 'Shift B', color: 'yellow', colorCode: '#EAB308', members: ['Furys', 'Severin', 'Marly', 'Sahra'] },
  C: { name: 'Shift C', color: 'green', colorCode: '#22C55E', members: ['Kevine', 'Audrey', 'Lapreuve', 'Lotti'] },
};

export const CYCLE_TOTAL_DAYS = 9;

export const SHIFT_HEX: Record<string, string> = {
  A: '#3B82F6',
  B: '#EAB308',
  C: '#22C55E',
};

export const getShiftColor = (shiftName: string): string => {
  return SHIFT_HEX[shiftName] || '#6B7280';
};

export const getShiftLightBg = (shiftName: string): string => {
  const colors: Record<string, string> = {
    A: 'bg-blue-100 dark:bg-blue-900/30',
    B: 'bg-yellow-100 dark:bg-yellow-900/30',
    C: 'bg-green-100 dark:bg-green-900/30',
  };
  return colors[shiftName] || 'bg-gray-100 dark:bg-gray-900/30';
};