import { useEffect } from 'react';
import { usePreferences } from '../store/usePreferences';

const presets: Record<string, { bg: string; card: string; border: string; fg: string; muted: string }> = {
  linen:     { bg: 'oklch(0.96 0.004 75)',  card: 'oklch(0.995 0.002 75)', border: 'oklch(0.90 0.004 70)',  fg: 'oklch(0.13 0.02 55)',  muted: 'oklch(0.50 0.015 55)' },
  slate:     { bg: 'oklch(0.95 0.005 250)', card: 'oklch(0.99 0.003 250)', border: 'oklch(0.90 0.005 250)', fg: 'oklch(0.15 0.01 250)', muted: 'oklch(0.50 0.01 250)' },
  parchment: { bg: 'oklch(0.95 0.01 80)',   card: 'oklch(0.99 0.005 80)',  border: 'oklch(0.88 0.01 75)',   fg: 'oklch(0.15 0.02 60)',  muted: 'oklch(0.50 0.02 60)' },
  fog:       { bg: 'oklch(0.96 0.002 260)', card: 'oklch(0.995 0.001 260)',border: 'oklch(0.91 0.002 260)', fg: 'oklch(0.15 0.005 260)',muted: 'oklch(0.52 0.005 260)' },
  graphite:  { bg: 'oklch(0.94 0 0)',       card: 'oklch(0.99 0 0)',       border: 'oklch(0.88 0 0)',       fg: 'oklch(0.15 0 0)',      muted: 'oklch(0.50 0 0)' },
  midnight:  { bg: 'oklch(0.17 0.02 260)',  card: 'oklch(0.22 0.02 260)', border: 'oklch(0.28 0.015 260)', fg: 'oklch(0.95 0.005 70)', muted: 'oklch(0.55 0.01 260)' },
  forest:    { bg: 'oklch(0.17 0.02 150)',  card: 'oklch(0.22 0.02 150)', border: 'oklch(0.28 0.015 150)', fg: 'oklch(0.95 0.005 80)', muted: 'oklch(0.55 0.01 150)' },
  rose:      { bg: 'oklch(0.96 0.01 10)',   card: 'oklch(0.995 0.005 10)',border: 'oklch(0.90 0.01 10)',   fg: 'oklch(0.15 0.02 10)',  muted: 'oklch(0.50 0.015 10)' },
};

export function useTheme() {
  const { themeMode, themePreset } = usePreferences();

  useEffect(() => {
    const root = document.documentElement;

    // Handle dark mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = themeMode === 'dark' || (themeMode === 'system' && prefersDark);

    // Dark presets override regardless of mode toggle
    const isDarkPreset = themePreset === 'midnight' || themePreset === 'forest';
    const effectivelyDark = isDark || isDarkPreset;

    if (effectivelyDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply preset colors
    const preset = presets[themePreset] || presets.linen;
    root.style.setProperty('--background', preset.bg);
    root.style.setProperty('--card', preset.card);
    root.style.setProperty('--popover', preset.card);
    root.style.setProperty('--border', preset.border);
    root.style.setProperty('--input', preset.border);
    root.style.setProperty('--foreground', preset.fg);
    root.style.setProperty('--card-foreground', preset.fg);
    root.style.setProperty('--popover-foreground', preset.fg);
    root.style.setProperty('--muted-foreground', preset.muted);

    // Sidebar stays dark for all light themes, matches card for dark themes
    if (effectivelyDark) {
      root.style.setProperty('--sidebar', preset.card);
      root.style.setProperty('--sidebar-foreground', preset.fg);
      root.style.setProperty('--sidebar-border', preset.border);
      root.style.setProperty('--sidebar-accent', preset.bg);
    } else {
      root.style.setProperty('--sidebar', 'oklch(0.17 0.02 250)');
      root.style.setProperty('--sidebar-foreground', 'oklch(0.90 0.005 70)');
      root.style.setProperty('--sidebar-border', 'oklch(0.25 0.015 250)');
      root.style.setProperty('--sidebar-accent', 'oklch(0.22 0.02 250)');
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (themeMode === 'system') {
        if (mediaQuery.matches) root.classList.add('dark');
        else root.classList.remove('dark');
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [themeMode, themePreset]);
}
