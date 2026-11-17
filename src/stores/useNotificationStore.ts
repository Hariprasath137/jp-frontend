// src/stores/useNotificationStore.ts
import { create } from 'zustand';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  bikeId?: string; 
  timestamp: number;
  read: boolean;
}

interface NotificationStore {
  notifications: AppNotification[];
  addNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  addNotification: (notif) => set((state) => ({
    // Puthu notification-ah first-la add pandrom
    notifications: [{
      ...notif,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      read: false
    }, ...state.notifications]
  })),
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    )
  })),
  clearAll: () => set({ notifications: [] })
}));