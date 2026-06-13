/**
 * Zustand store cho UI state dùng chung toàn app.
 */

import { create } from 'zustand';

export type AreaFilter = number | 'all';

function currentPeriod(): string {
   const now = new Date();
   return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

interface AppState {
   currentArea: AreaFilter;
   searchQuery: string;
   period: string;
   unreadNotifications: number;
   setCurrentArea: (area: AreaFilter) => void;
   setSearchQuery: (query: string) => void;
   setPeriod: (period: string) => void;
   setUnreadNotifications: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
   currentArea: 'all',
   searchQuery: '',
   period: currentPeriod(),
   unreadNotifications: 1,
   setCurrentArea: (currentArea) => set({ currentArea }),
   setSearchQuery: (searchQuery) => set({ searchQuery }),
   setPeriod: (period) => set({ period }),
   setUnreadNotifications: (unreadNotifications) => set({ unreadNotifications }),
}));
