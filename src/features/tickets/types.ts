// ============================================
// TICKETS FEATURE — Types & Interfaces
// ============================================

import type { TicketStatus, TicketPriority, TicketCategory } from '@/types';
import type { TicketComment, TicketAttachment, TicketHistory } from '@/types';

export type { TicketStatus, TicketPriority, TicketCategory };

export type TicketDialogResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface TicketItem {
  id: string;
  numero: string;
  objet: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  site: string;
  localite: string;
  technicien: string;
  reporterId: string;
  reporterName: string;
  assigneeId?: string;
  assigneeName?: string;
  comments: TicketComment[];
  attachments: TicketAttachment[];
  history: TicketHistory[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  dueDate?: Date;
  etr?: Date;
  sla?: string;
  slr?: string;
  isArchived: boolean;
  archivedAt?: Date;
  archiveYear?: number;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface TicketOptionItem {
  id: string;
  name: string;
  localite?: string | null;
}

export interface TicketCountryOption {
  code: string;
  name: string;
  flag: string;
}

export interface TicketLocalityDraft {
  countryCode: string;
  countryName: string;
  city: string;
  arrondissement: string;
  quartier: string;
  address: string;
  latitude: string;
  longitude: string;
  freeText: string;
}

export interface UserBasic {
  id: string;
  name: string;
  role?: string;
  isActive?: boolean;
}
