import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UnitSystem } from '../lib/units';

export interface CardConfig {
  id: string;
  label: string;
  visible: boolean;
}

export interface ChartConfig {
  id: string;
  label: string;
  visible: boolean;
  comparison: 'YoY' | 'MoM' | 'WoW' | 'None';
}

interface PreferencesState {
  units: UnitSystem;
  setUnits: (units: UnitSystem) => void;

  themeMode: 'light' | 'dark' | 'system';
  themePreset: string;
  accentColor: string;
  surfaceWarmth: number;
  chartPair: string;
  setTheme: (updates: Partial<Pick<PreferencesState, 'themeMode' | 'themePreset' | 'accentColor' | 'surfaceWarmth' | 'chartPair'>>) => void;

  cards: CardConfig[];
  charts: ChartConfig[];
  setCards: (cards: CardConfig[]) => void;
  setCharts: (charts: ChartConfig[]) => void;
  toggleCard: (id: string) => void;
  toggleChart: (id: string) => void;
  setChartComparison: (id: string, comparison: 'YoY' | 'MoM' | 'WoW' | 'None') => void;
}

const defaultCards: CardConfig[] = [
  { id: 'fitness-ctl', label: 'Fitness CTL', visible: true },
  { id: 'resting-hr', label: 'Resting HR', visible: true },
  { id: 'vo2max', label: 'VO2 Max', visible: true },
  { id: 'hrv', label: 'HRV', visible: true },
  { id: 'body-battery', label: 'Body Battery', visible: true },
  { id: 'sleep-score', label: 'Sleep Score', visible: true },
  { id: 'weekly-distance', label: 'Weekly Distance', visible: true },
  { id: 'weekly-elevation', label: 'Weekly Elevation', visible: true },
  { id: 'streak', label: 'Streak', visible: false },
  { id: 'weight', label: 'Weight Trend', visible: false },
];

const defaultCharts: ChartConfig[] = [
  { id: 'weekly-distance-chart', label: 'Weekly Distance', visible: true, comparison: 'YoY' },
  { id: 'year-heatmap', label: 'Year View Heatmap', visible: true, comparison: 'None' },
  { id: 'hr-zone-dist', label: 'HR Zone Distribution', visible: true, comparison: 'YoY' },
];

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      units: (localStorage.getItem('atlas-units') as UnitSystem) || 'imperial',
      setUnits: (units) => {
        localStorage.setItem('atlas-units', units);
        set({ units });
      },

      themeMode: 'light',
      themePreset: 'linen',
      accentColor: '#8cd5ee',
      surfaceWarmth: 50,
      chartPair: 'nature',
      setTheme: (updates) => set(updates),

      cards: defaultCards,
      charts: defaultCharts,
      setCards: (cards) => set({ cards }),
      setCharts: (charts) => set({ charts }),
      toggleCard: (id) =>
        set((state) => ({
          cards: state.cards.map((c) =>
            c.id === id ? { ...c, visible: !c.visible } : c
          ),
        })),
      toggleChart: (id) =>
        set((state) => ({
          charts: state.charts.map((c) =>
            c.id === id ? { ...c, visible: !c.visible } : c
          ),
        })),
      setChartComparison: (id, comparison) =>
        set((state) => ({
          charts: state.charts.map((c) =>
            c.id === id ? { ...c, comparison } : c
          ),
        })),
    }),
    { name: 'atlas-preferences' }
  )
);
