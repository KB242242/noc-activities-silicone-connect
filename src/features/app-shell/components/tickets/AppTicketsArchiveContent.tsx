import { useMemo } from 'react';

import { TicketArchiveDashboard } from '@/features/app-shell/lazy-components';

type ArchiveStatusBadge = {
  bgColor: string;
  color: string;
  label: string;
};

type ArchiveReport = {
  totalArchived: number;
  slaSatisfied: number;
  slaRate: number;
  openInSelectedYear: number;
};

type ArchiveStatusOption = {
  key: string;
  label: string;
};

type ArchivePriorityOption = {
  key: string;
  label: string;
};

type ArchiveBucketTicket = {
  id: string;
  numero: string;
  objet: string;
  status: string;
  site: string;
  localite: string;
  createdAt: Date;
  technicien?: string | null;
};

type ArchiveYearBucket<T extends ArchiveBucketTicket> = {
  year: number;
  items: T[];
};

type AppTicketsArchiveContentProps<T extends ArchiveBucketTicket> = {
  archiveYears: number[];
  archiveYearFilter: 'all' | string;
  archiveYearBuckets: Array<ArchiveYearBucket<T>>;
  archiveReport: ArchiveReport;
  statusOptions: ArchiveStatusOption[];
  priorityOptions: ArchivePriorityOption[];
  onArchiveYearChange: (value: 'all' | string) => void;
  onBackToActive: () => void;
  onViewTicket: (ticketId: string) => void;
  onUnarchiveTicket: (ticketId: string) => void;
  statusBadge: (status: string) => ArchiveStatusBadge;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function AppTicketsArchiveContent<T extends ArchiveBucketTicket>({
  archiveYears,
  archiveYearFilter,
  archiveYearBuckets,
  archiveReport,
  statusOptions,
  priorityOptions,
  onArchiveYearChange,
  onBackToActive,
  onViewTicket,
  onUnarchiveTicket,
  statusBadge,
}: AppTicketsArchiveContentProps<T>) {
  const ticketSiteOptions = useMemo(
    () =>
      Array.from(new Set(archiveYearBuckets.flatMap((bucket) => bucket.items.map((ticket) => ticket.site).filter(isNonEmptyString)))).map((name) => ({
        id: name,
        name,
      })),
    [archiveYearBuckets]
  );

  const ticketLocalityOptions = useMemo(
    () =>
      Array.from(new Set(archiveYearBuckets.flatMap((bucket) => bucket.items.map((ticket) => ticket.localite).filter(isNonEmptyString)))),
    [archiveYearBuckets]
  );

  const ticketTechnicianOptions = useMemo(
    () =>
      Array.from(new Set(archiveYearBuckets.flatMap((bucket) => bucket.items.map((ticket) => ticket.technicien).filter(isNonEmptyString)))).map((name) => ({
        id: name,
        name,
      })),
    [archiveYearBuckets]
  );

  return (
    <TicketArchiveDashboard
      archiveYears={archiveYears}
      archiveYearFilter={archiveYearFilter}
      archiveYearBuckets={archiveYearBuckets as any}
      archiveReport={archiveReport}
      onArchiveYearChange={onArchiveYearChange}
      onBackToActive={onBackToActive}
      onViewTicket={onViewTicket}
      onUnarchiveTicket={onUnarchiveTicket}
      statusBadge={statusBadge}
      statusOptions={statusOptions}
      ticketSiteOptions={ticketSiteOptions}
      ticketLocalityOptions={ticketLocalityOptions}
      ticketTechnicianOptions={ticketTechnicianOptions}
      priorityOptions={priorityOptions}
    />
  );
}
