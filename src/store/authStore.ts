import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'AGENT';

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  role: UserRole;
  shiftId?: string | null;
  shift?: {
    id: string;
    name: string;
    color: string;
    colorCode: string;
  } | null;
  avatar?: string | null;
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      
      login: async (email: string) => {
        try {
          const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          
          const data = await response.json();
          
          if (data.success && data.user) {
            set({ user: data.user, isAuthenticated: true });
            return { success: true };
          }
          
          return { success: false, error: data.error || 'Erreur de connexion' };
        } catch {
          return { success: false, error: 'Erreur de connexion' };
        }
      },
      
      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
      
      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      }
    }),
    {
      name: 'noc-auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated })
    }
  )
);
