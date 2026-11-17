// src/stores/useAuthStore.ts
import { create } from 'zustand';
import { auth } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';

interface AuthState {
  user: any | null;
  isInitialized: boolean; // Firebase load aagura varaikum wait panna
  initAuth: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isInitialized: false,
  
  initAuth: () => {
    // Firebase automatic ah login aagiruka nu check pannum
    onAuthStateChanged(auth, (user) => {
      set({ user, isInitialized: true });
    });
  },
  
  logout: async () => {
    await signOut(auth);
    set({ user: null });
  }
}));