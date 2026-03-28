// ============================================
// UTILITY FUNCTIONS - NOC Activities
// ============================================

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PasswordValidation, Ticket, TicketStatus } from '@/types';

// ============================================
// CLASS NAME UTILITY (for shadcn/ui)
// ============================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// ID GENERATION
// ============================================

/**
 * Generate a unique ticket number
 * Format: #SC[DDMMYYYY]-[INCREMENT]
 * Example: #SC13032026-100002724
 */
export function generateTicketNumber(existingNumbers: string[] = []): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const dateStr = `${day}${month}${year}`;

  // Find the highest increment for today
  let maxIncrement = 100000000; // Start at 100000000
  const prefix = `#SC${dateStr}-`;

  existingNumbers.forEach(num => {
    if (num.startsWith(prefix)) {
      const increment = parseInt(num.replace(prefix, ''), 10);
      if (increment > maxIncrement) {
        maxIncrement = increment;
      }
    }
  });

  const newIncrement = maxIncrement + 1;
  return `${prefix}${newIncrement}`;
}

/**
 * Generate a unique ID for any entity
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// PASSWORD VALIDATION
// ============================================

export function validatePassword(password: string): PasswordValidation {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]/.test(password);

  const score = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
  const strength: 'weak' | 'medium' | 'strong' = score <= 2 ? 'weak' : score === 3 ? 'medium' : 'strong';

  return {
    isValid: hasMinLength && hasUppercase && hasNumber && hasSpecial,
    hasMinLength,
    hasUppercase,
    hasNumber,
    hasSpecial,
    strength
  };
}

/**
 * Simple hash for client-side password handling
 * Note: In production, use bcrypt on the server
 */
export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash)}_${password.length}_${btoa(password.slice(0, 3))}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash || password === hash;
}

// ============================================
// DATE FORMATTING
// ============================================

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
}

export function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return 'À l\'instant';
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `Il y a ${Math.floor(seconds / 86400)} j`;
  return formatDate(d);
}

export function getTimeSinceOpening(createdAt: Date | string): { hours: number; minutes: number; seconds: number; formatted: string } {
  const now = new Date();
  const created = new Date(createdAt);
  const diff = now.getTime() - created.getTime();

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const formatted = `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;

  return { hours, minutes, seconds, formatted };
}

// ============================================
// SLA CALCULATIONS
// ============================================

export function isSlaExceeded(dueDate: Date | string): boolean {
  return new Date() > new Date(dueDate);
}

export function getSlaRemaining(dueDate: Date | string): { exceeded: boolean; remaining: number; formatted: string } {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();

  const exceeded = diff < 0;
  const remaining = Math.abs(diff);

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  const formatted = exceeded
    ? `Dépassé de ${hours}h ${minutes}min`
    : `${hours}h ${minutes}min restantes`;

  return { exceeded, remaining, formatted };
}

// ============================================
// TICKET UTILITIES
// ============================================

export function calculateOutageDuration(startTime?: Date | string, endTime?: Date | string): number | null {
  if (!startTime || !endTime) return null;

  const start = new Date(startTime);
  const end = new Date(endTime);

  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}

export function formatOutageDuration(durationMinutes: number): string {
  if (durationMinutes < 60) return `${durationMinutes}min`;

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (hours < 24) {
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  let result = `${days}j`;
  if (remainingHours > 0) result += ` ${remainingHours}h`;
  if (minutes > 0 && days === 0) result += ` ${minutes}min`;

  return result;
}

// ============================================
// FILTERING & SEARCH
// ============================================

export function filterBySearch<T extends Record<string, any>>(
  items: T[],
  searchQuery: string,
  searchFields: (keyof T)[]
): T[] {
  if (!searchQuery.trim()) return items;

  const query = searchQuery.toLowerCase().trim();

  return items.filter(item =>
    searchFields.some(field => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(query);
      }
      if (Array.isArray(value)) {
        return value.some(v =>
          typeof v === 'string' && v.toLowerCase().includes(query)
        );
      }
      return false;
    })
  );
}

// ============================================
// FILE UTILITIES
// ============================================

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

export function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename).toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
}

export function isPdfFile(filename: string): boolean {
  return getFileExtension(filename).toLowerCase() === 'pdf';
}

// ============================================
// STRING UTILITIES
// ============================================

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================
// ARRAY UTILITIES
// ============================================

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const value = String(item[key]);
    if (!groups[value]) {
      groups[value] = [];
    }
    groups[value].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

export function sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

export function uniqueBy<T>(array: T[], key: keyof T): T[] {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

// ============================================
// VALIDATION
// ============================================

export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const regex = /^[\d\s\-+()]{8,}$/;
  return regex.test(phone);
}

// ============================================
// COLOR UTILITIES
// ============================================

export function getShiftColor(shiftName: string): string {
  const colors: Record<string, string> = {
    'A': '#3B82F6',
    'B': '#EAB308',
    'C': '#22C55E'
  };
  return colors[shiftName] || '#6B7280';
}

export function getStatusColor(status: TicketStatus): string {
  const colors: Record<TicketStatus, string> = {
    open: '#EF4444',
    in_progress: '#3B82F6',
    pending: '#EAB308',
    escalated: '#F97316',
    suspended: '#8B5CF6',
    waiting_fiche: '#6366F1',
    resolved: '#22C55E',
    closed: '#6B7280'
  };
  return colors[status] || '#6B7280';
}

// ============================================
// LOCAL STORAGE
// ============================================

export function saveToStorage<T>(key: string, value: T): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window !== 'undefined') {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return defaultValue;
    }
  }
  return defaultValue;
}

export function removeFromStorage(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(key);
  }
}
