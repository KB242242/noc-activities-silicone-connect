export const SHIFT_CYCLE_START: Record<string, Date> = {
  A: new Date('2026-02-24T00:00:00'),
  B: new Date('2026-02-21T00:00:00'),
  C: new Date('2026-02-18T00:00:00'),
};

export const SHIFTS_DATA: Record<string, { name: string; color: string; colorCode: string; members: string[] }> = {
  A: { name: 'Shift A', color: 'blue', colorCode: '#3B82F6', members: ['Luca', 'Alaine', 'Casimir'] },
  B: { name: 'Shift B', color: 'yellow', colorCode: '#EAB308', members: ['Furys', 'Wivine'] },
  C: { name: 'Shift C', color: 'green', colorCode: '#22C55E', members: ['Kevine', 'Audrey', 'Lapreuve'] },
};

export const SHIFT_INDIVIDUAL_REST_MEMBERS: Record<string, string[]> = {
  A: ['Alaine', 'Casimir', 'Luca'],
  B: ['Furys', 'Wivine'],
  C: ['Kevine', 'Audrey', 'Lapreuve'],
};

export const SHIFT_INDIVIDUAL_REST_BASE_CYCLE: Record<string, number> = {
  A: 13,
  B: 14,
  C: 14,
};

export const SHIFT_INDIVIDUAL_REST_MEMBER_OVERRIDES: Record<string, Record<string, string[]>> = {
  B: {},
};

export const SHIFT_INDIVIDUAL_REST_EFFECTIVE_CONFIG: Record<string, Array<{ from: string; members: string[]; cycleAnchor: number }>> = {
  // June 2026 onward: anchor each shift on the validated 15-23 June RI block,
  // then rotate each agent to the next night slot on every following cycle.
  A: [{ from: '2026-06-01', members: ['Casimir', 'Alaine', 'Luca'], cycleAnchor: 13 }],
  B: [{ from: '2026-06-01', members: ['Sara', 'Furys', 'Wivine'], cycleAnchor: 14 }],
  C: [{ from: '2026-06-01', members: ['Lapreuve', 'Kevine', 'Audrey'], cycleAnchor: 14 }],
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
