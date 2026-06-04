import type { ComponentProps } from 'react';

import { AppTicketsActiveContent } from '@/features/app-shell/components/tickets/content/AppTicketsActiveContent';
import { AppTicketsArchiveContent } from '@/features/app-shell/components/tickets/content/AppTicketsArchiveContent';
import { AppTicketsHeader } from '@/features/app-shell/components/tickets/layout/AppTicketsHeader';
import { AppTicketsHeaderActions } from '@/features/app-shell/components/tickets/layout/AppTicketsHeaderActions';
import { AppTicketsLocalityDialog } from '@/features/app-shell/components/tickets/dialogs/AppTicketsLocalityDialog';

type HeaderActionsProps = Omit<ComponentProps<typeof AppTicketsHeaderActions>, 'localityDialogSlot'>;
type LocalityDialogProps = ComponentProps<typeof AppTicketsLocalityDialog>;
type ActiveContentProps = ComponentProps<typeof AppTicketsActiveContent<any>>;
type ArchiveContentProps = ComponentProps<typeof AppTicketsArchiveContent<any>>;

type AppTicketsTabContentProps = {
  showArchivedTickets: boolean;
  headerActionsProps: HeaderActionsProps;
  localityDialogProps: LocalityDialogProps;
  activeContentProps: ActiveContentProps;
  archiveContentProps: ArchiveContentProps;
};

export function AppTicketsTabContent({
  showArchivedTickets,
  headerActionsProps,
  localityDialogProps,
  activeContentProps,
  archiveContentProps,
}: AppTicketsTabContentProps) {
  return (
    <>
      <AppTicketsHeader
        actions={
          <>
            <AppTicketsHeaderActions
              {...headerActionsProps}
              localityDialogSlot={<AppTicketsLocalityDialog {...localityDialogProps} />}
            />
          </>
        }
      />

      {!showArchivedTickets ? (
        <AppTicketsActiveContent<any> {...activeContentProps} />
      ) : (
        <AppTicketsArchiveContent<any> {...archiveContentProps} />
      )}
    </>
  );
}
