import type { AtlasActivity } from '../db/schema';

/**
 * Parse a Garmin-style summary CSV with columns: Month, Activity Type, Value (count)
 * Creates individual activity records spread across the month.
 */
export function parseActivitiesCSV(csvText: string): AtlasActivity[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const activities: AtlasActivity[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV — handle the leading comma (empty first column header)
    const parts = line.split(',').map((s) => s.trim());
    const monthStr = parts[0]; // e.g. "May 2025"
    const activityType = parts[1]; // e.g. "Running"
    const count = parseInt(parts[2], 10);

    if (!monthStr || !activityType || isNaN(count) || count <= 0) continue;

    // Parse month string to get year and month
    const monthDate = new Date(monthStr + ' 1');
    if (isNaN(monthDate.getTime())) continue;

    const year = monthDate.getFullYear();
    const month = monthDate.getMonth(); // 0-indexed
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Spread activities evenly across the month
    for (let j = 0; j < count; j++) {
      const day = Math.min(Math.floor((j / count) * daysInMonth) + 1, daysInMonth);
      const date = new Date(year, month, day, 8 + (j % 12), j * 7 % 60);
      const timestamp = date.getTime();
      const dateStr = date.toISOString().slice(0, 10);

      const sport = mapCSVSport(activityType);

      // Estimate reasonable defaults based on sport type
      const defaults = getDefaults(sport);

      const activity: AtlasActivity = {
        id: `csv-${timestamp}-${sport}-${j}`,
        timestamp,
        date: dateStr,
        sport,
        duration: defaults.duration,
        distance: defaults.distance,
        elevationGain: defaults.elevation,
        avgHR: defaults.avgHR,
        maxHR: defaults.maxHR,
        calories: defaults.calories,
      };

      activities.push(activity);
    }
  }

  return activities;
}

function mapCSVSport(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('running')) return 'Running';
  if (lower.includes('cycling')) return 'Cycling';
  if (lower.includes('swimming')) return 'Swimming';
  if (lower.includes('walking')) return 'Walking';
  if (lower.includes('hiking')) return 'Hiking';
  if (lower.includes('gym') || lower.includes('fitness')) return 'Gym';
  if (lower.includes('yoga')) return 'Yoga';
  if (lower.includes('strength') || lower.includes('weight')) return 'Strength';
  return 'Other';
}

function getDefaults(sport: string) {
  switch (sport) {
    case 'Running':
      return { duration: 1800 + Math.random() * 1800, distance: 5000 + Math.random() * 6000, elevation: 30 + Math.random() * 80, avgHR: 145 + Math.round(Math.random() * 20), maxHR: 170 + Math.round(Math.random() * 15), calories: 300 + Math.round(Math.random() * 300) };
    case 'Cycling':
      return { duration: 2400 + Math.random() * 3600, distance: 15000 + Math.random() * 30000, elevation: 100 + Math.random() * 400, avgHR: 130 + Math.round(Math.random() * 20), maxHR: 160 + Math.round(Math.random() * 15), calories: 400 + Math.round(Math.random() * 500) };
    case 'Gym':
      return { duration: 2400 + Math.random() * 1800, distance: 0, elevation: 0, avgHR: 110 + Math.round(Math.random() * 25), maxHR: 145 + Math.round(Math.random() * 20), calories: 200 + Math.round(Math.random() * 200) };
    case 'Walking':
      return { duration: 1800 + Math.random() * 2400, distance: 3000 + Math.random() * 4000, elevation: 10 + Math.random() * 50, avgHR: 100 + Math.round(Math.random() * 15), maxHR: 120 + Math.round(Math.random() * 15), calories: 150 + Math.round(Math.random() * 150) };
    default:
      return { duration: 1800 + Math.random() * 1800, distance: 2000 + Math.random() * 3000, elevation: 20 + Math.random() * 50, avgHR: 120 + Math.round(Math.random() * 20), maxHR: 150 + Math.round(Math.random() * 15), calories: 200 + Math.round(Math.random() * 200) };
  }
}
