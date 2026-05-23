import { toast as sonnerToast } from 'sonner';

const createToastId = (type: 'success' | 'error' | 'warning' | 'info') =>
  `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const toast = {
  success: (message: string, options?: Record<string, unknown>) =>
    sonnerToast.success(message, { id: createToastId('success'), ...(options ?? {}) }),
  error: (message: string, options?: Record<string, unknown>) =>
    sonnerToast.error(message, { id: createToastId('error'), ...(options ?? {}) }),
  warning: (message: string, options?: Record<string, unknown>) =>
    sonnerToast.warning(message, { id: createToastId('warning'), ...(options ?? {}) }),
  info: (message: string, options?: Record<string, unknown>) =>
    sonnerToast.info(message, { id: createToastId('info'), ...(options ?? {}) }),
  dismiss: sonnerToast.dismiss,
};
