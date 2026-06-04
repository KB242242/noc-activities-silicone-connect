import type { AuditLogEntry, UserProfile } from '@/features/app-shell/core/shared/types';

export type BootstrapLocalData<TSectionAccess extends Record<string, boolean>> = {
  allUsers?: UserProfile[];
  usersToPersist?: UserProfile[];
  auditLogs?: AuditLogEntry[];
  sectionAccess?: TSectionAccess;
  announcementAvatar?: string;
};

export function readBootstrapLocalData<TSectionAccess extends Record<string, boolean>>(params: {
  storage: Storage;
  defaultSectionAccess: TSectionAccess;
  demoUsers: UserProfile[];
}): BootstrapLocalData<TSectionAccess> {
  const { storage, defaultSectionAccess, demoUsers } = params;
  const result: BootstrapLocalData<TSectionAccess> = {};

  const storedUsers = storage.getItem('noc_all_users');
  if (storedUsers) {
    try {
      const parsed = JSON.parse(storedUsers);
      if (Array.isArray(parsed) && parsed.length > 0) {
        result.allUsers = parsed as UserProfile[];
      }
    } catch {
      // ignore malformed cache
    }
  } else {
    result.allUsers = demoUsers;
    result.usersToPersist = demoUsers;
  }

  const storedLogs = storage.getItem('noc_audit_logs');
  if (storedLogs) {
    try {
      const parsed = JSON.parse(storedLogs);
      if (Array.isArray(parsed) && parsed.length > 0) {
        result.auditLogs = parsed as AuditLogEntry[];
      }
    } catch {
      // ignore malformed cache
    }
  }

  const storedSectionAccess = storage.getItem('noc_section_access');
  if (storedSectionAccess) {
    try {
      const parsed = JSON.parse(storedSectionAccess);
      result.sectionAccess = { ...defaultSectionAccess, ...(parsed || {}) };
    } catch {
      result.sectionAccess = { ...defaultSectionAccess };
    }
  }

  const storedAnnouncementAvatar = storage.getItem('noc_announcements_avatar');
  if (storedAnnouncementAvatar) {
    result.announcementAvatar = storedAnnouncementAvatar;
  }

  return result;
}