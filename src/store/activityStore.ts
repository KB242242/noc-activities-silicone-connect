import { create } from 'zustand';

export type ActivityType = 
  | 'CLIENT_DOWN'
  | 'INTERFACE_UNSTABLE'
  | 'RECURRENT_PROBLEM'
  | 'OTHER_MONITORING'
  | 'TICKET_CREATED'
  | 'CLIENT_CALL'
  | 'ESCALATION'
  | 'INCIDENT_FOLLOWUP'
  | 'REPORT_GENERATED'
  | 'HANDOVER_DONE'
  | 'TICKET_CLOSED';

export interface Activity {
  id: string;
  userId: string;
  userName: string;
  type: ActivityType;
  category: string;
  description: string;
  createdAt: string;
}

interface ActivityState {
  activities: Activity[];
  recentActivities: Activity[];
  isLoading: boolean;
  
  fetchActivities: (userId?: string, limit?: number) => Promise<void>;
  fetchRecentActivities: (limit?: number) => Promise<void>;
  addActivity: (activity: { type: ActivityType; description: string }) => Promise<{ success: boolean; error?: string }>;
}

export const ACTIVITY_CATEGORIES: Record<string, ActivityType[]> = {
  'Monitoring': ['CLIENT_DOWN', 'INTERFACE_UNSTABLE', 'RECURRENT_PROBLEM', 'OTHER_MONITORING'],
  'Call Center': ['TICKET_CREATED', 'CLIENT_CALL', 'ESCALATION', 'INCIDENT_FOLLOWUP'],
  'Reporting': ['REPORT_GENERATED', 'HANDOVER_DONE', 'TICKET_CLOSED']
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  CLIENT_DOWN: 'Client Down',
  INTERFACE_UNSTABLE: 'Interface instable',
  RECURRENT_PROBLEM: 'Problème récurrent',
  OTHER_MONITORING: 'Autre monitoring',
  TICKET_CREATED: 'Ticket créé',
  CLIENT_CALL: 'Appel client',
  ESCALATION: 'Escalade',
  INCIDENT_FOLLOWUP: 'Suivi incident',
  REPORT_GENERATED: 'Rapport généré',
  HANDOVER_DONE: 'Handover effectué',
  TICKET_CLOSED: 'Ticket clôturé'
};

export const useActivityStore = create<ActivityState>((set) => ({
  activities: [],
  recentActivities: [],
  isLoading: false,
  
  fetchActivities: async (userId?: string, limit = 50) => {
    try {
      set({ isLoading: true });
      const url = userId 
        ? `/api/activities?userId=${userId}&limit=${limit}`
        : `/api/activities?limit=${limit}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        set({ activities: data.activities, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
  
  fetchRecentActivities: async (limit = 10) => {
    try {
      const response = await fetch(`/api/activities/recent?limit=${limit}`);
      const data = await response.json();
      
      if (data.success) {
        set({ recentActivities: data.activities });
      }
    } catch {
      // Silent fail
    }
  },
  
  addActivity: async (activity: { type: ActivityType; description: string }) => {
    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh recent activities
        set((state) => ({
          recentActivities: [data.activity, ...state.recentActivities].slice(0, 20)
        }));
        return { success: true };
      }
      
      return { success: false, error: data.error };
    } catch {
      return { success: false, error: 'Erreur lors de l\'ajout' };
    }
  }
}));
