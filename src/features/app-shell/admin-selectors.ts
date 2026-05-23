import type { AuditLogEntry, UserProfile, UserRole } from '@/features/app-shell/types';

export function getUniqueAuditActionTypes(auditLogs: AuditLogEntry[]): string[] {
  return Array.from(new Set(auditLogs.map((log) => log.action))).sort();
}

export function filterAuditLogs(params: {
  auditLogs: AuditLogEntry[];
  dateFrom: string;
  dateTo: string;
  actionType: string;
  statusFilter: string;
  userFilter: string;
}): AuditLogEntry[] {
  const { auditLogs, dateFrom, dateTo, actionType, statusFilter, userFilter } = params;

  return auditLogs.filter((log) => {
    const logDate = new Date(log.createdAt);
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      if (logDate < fromDate) return false;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (logDate > toDate) return false;
    }

    if (actionType !== 'all' && log.action !== actionType) {
      return false;
    }

    if (statusFilter !== 'all' && log.status !== statusFilter) {
      return false;
    }

    if (userFilter && !log.userName.toLowerCase().includes(userFilter.toLowerCase())) {
      return false;
    }

    return true;
  });
}

export function filterUsers(params: {
  users: UserProfile[];
  searchQuery: string;
  roleFilter: UserRole | 'all';
}): UserProfile[] {
  const { users, searchQuery, roleFilter } = params;
  const lowerSearch = searchQuery.toLowerCase();

  return users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(lowerSearch)
      || user.email.toLowerCase().includes(lowerSearch)
      || (user.username && user.username.toLowerCase().includes(lowerSearch));

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });
}
