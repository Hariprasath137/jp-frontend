import { create } from 'zustand';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';

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
  setNotifications: (notifs: AppNotification[]) => void;
  markAsRead: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  
  // DB la irunthu vara data va UI ku set pannum
  setNotifications: (notifs) => set({ notifications: notifs }),
  
  // DB la 'read' status ah update pannum
  markAsRead: async (id) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  },
  
  // Clear All kudutha DB la irunthu total ah delete pannidum
  clearAll: async () => {
    const batch = writeBatch(db);
    get().notifications.forEach(n => {
      batch.delete(doc(db, 'notifications', n.id));
    });
    await batch.commit();
  }
}));