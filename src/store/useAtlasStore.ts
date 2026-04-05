import { create } from 'zustand';

interface AtlasState {
  // Date range
  startDate: string;
  endDate: string;
  setDateRange: (start: string, end: string) => void;

  // Sport filter
  activeSport: string;
  setActiveSport: (sport: string) => void;

  // Import state
  isImporting: boolean;
  importProgress: { current: number; total: number } | null;
  setImporting: (importing: boolean) => void;
  setImportProgress: (progress: { current: number; total: number } | null) => void;

  // Data loaded flag
  hasData: boolean;
  setHasData: (has: boolean) => void;

  // First launch
  showWelcome: boolean;
  setShowWelcome: (show: boolean) => void;
}

const now = new Date();
const yearStart = new Date(now.getFullYear(), 0, 1);

export const useAtlasStore = create<AtlasState>((set) => ({
  startDate: yearStart.toISOString().slice(0, 10),
  endDate: now.toISOString().slice(0, 10),
  setDateRange: (start, end) => set({ startDate: start, endDate: end }),

  activeSport: 'all',
  setActiveSport: (sport) => set({ activeSport: sport }),

  isImporting: false,
  importProgress: null,
  setImporting: (importing) => set({ isImporting: importing }),
  setImportProgress: (progress) => set({ importProgress: progress }),

  hasData: false,
  setHasData: (has) => set({ hasData: has }),

  showWelcome: !localStorage.getItem('atlas-units'),
  setShowWelcome: (show) => set({ showWelcome: show }),
}));
