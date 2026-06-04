export type TicketOption = {
  value?: string;
  key?: string;
  label: string;
};

export function buildTicketFilterOptions(source: Record<string, { label: string }>) {
  return Object.entries(source).map(([value, item]) => ({ value, label: item.label }));
}

export function buildTicketArchiveOptions(source: Record<string, { label: string }>) {
  return Object.entries(source).map(([key, item]) => ({ key, label: item.label }));
}