import type { AtlasActivity, WellnessDay } from '../db/schema';

// Training Stress Score estimate (simplified)
export function estimateTSS(activity: AtlasActivity): number {
  if (!activity.avgHR || !activity.duration) return 0;
  const durationHours = activity.duration / 3600;
  const intensityFactor = activity.avgHR / 180; // simplified
  return Math.round(durationHours * intensityFactor * intensityFactor * 100);
}

// Chronic Training Load (CTL) - 42 day exponential moving average
export function calculateCTL(dailyTSS: { date: string; tss: number }[]): { date: string; ctl: number }[] {
  const sorted = [...dailyTSS].sort((a, b) => a.date.localeCompare(b.date));
  const result: { date: string; ctl: number }[] = [];
  let ctl = 0;
  const decay = 2 / (42 + 1);

  for (const day of sorted) {
    ctl = ctl * (1 - decay) + day.tss * decay;
    result.push({ date: day.date, ctl: Math.round(ctl * 10) / 10 });
  }
  return result;
}

// Acute Training Load (ATL) - 7 day exponential moving average
export function calculateATL(dailyTSS: { date: string; tss: number }[]): { date: string; atl: number }[] {
  const sorted = [...dailyTSS].sort((a, b) => a.date.localeCompare(b.date));
  const result: { date: string; atl: number }[] = [];
  let atl = 0;
  const decay = 2 / (7 + 1);

  for (const day of sorted) {
    atl = atl * (1 - decay) + day.tss * decay;
    result.push({ date: day.date, atl: Math.round(atl * 10) / 10 });
  }
  return result;
}

// Rolling average
export function rollingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    result.push(Math.round(avg * 10) / 10);
  }
  return result;
}

// Aggregate activities by week
export function aggregateByWeek(
  activities: AtlasActivity[],
  metric: 'distance' | 'duration' | 'elevationGain' | 'calories'
): { week: string; value: number }[] {
  const weekMap = new Map<string, number>();

  for (const a of activities) {
    const d = new Date(a.timestamp);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const weekKey = monday.toISOString().slice(0, 10);
    weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + (a[metric] || 0));
  }

  return Array.from(weekMap.entries())
    .map(([week, value]) => ({ week, value }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

// HR Zone buckets — returns time (seconds) spent in each zone
export interface HRZoneBucket {
  zone: number;
  label: string;
  min: number;
  max: number;
  seconds: number;
}

export function computeHRZoneBuckets(activities: AtlasActivity[]): HRZoneBucket[] {
  const buckets: HRZoneBucket[] = [
    { zone: 1, label: 'Zone 1 — Recovery', min: 0, max: 120, seconds: 0 },
    { zone: 2, label: 'Zone 2 — Aerobic', min: 120, max: 140, seconds: 0 },
    { zone: 3, label: 'Zone 3 — Tempo', min: 140, max: 155, seconds: 0 },
    { zone: 4, label: 'Zone 4 — Threshold', min: 155, max: 170, seconds: 0 },
    { zone: 5, label: 'Zone 5 — VO2max', min: 170, max: Infinity, seconds: 0 },
  ];

  for (const a of activities) {
    if (!a.avgHR || !a.duration) continue;
    const hr = a.avgHR;
    for (const b of buckets) {
      if (hr >= b.min && hr < b.max) {
        b.seconds += a.duration;
        break;
      }
    }
  }

  return buckets;
}

// Personal Records per sport per metric
export interface PRRecord {
  sport: string;
  metric: string;
  value: number;
  date: string;
  unit: string;
}

export function findPRs(activities: AtlasActivity[]): PRRecord[] {
  const sportMap = new Map<string, AtlasActivity[]>();
  for (const a of activities) {
    const list = sportMap.get(a.sport) || [];
    list.push(a);
    sportMap.set(a.sport, list);
  }

  const prs: PRRecord[] = [];

  for (const [sport, acts] of sportMap) {
    // Longest distance
    const byDist = acts.filter((a) => a.distance > 0).sort((a, b) => b.distance - a.distance);
    if (byDist.length > 0) {
      prs.push({ sport, metric: 'Longest Distance', value: byDist[0].distance, date: byDist[0].date, unit: 'm' });
    }

    // Longest duration
    const byDur = acts.filter((a) => a.duration > 0).sort((a, b) => b.duration - a.duration);
    if (byDur.length > 0) {
      prs.push({ sport, metric: 'Longest Duration', value: byDur[0].duration, date: byDur[0].date, unit: 's' });
    }

    // Most calories
    const byCal = acts.filter((a) => (a.calories || 0) > 0).sort((a, b) => (b.calories || 0) - (a.calories || 0));
    if (byCal.length > 0) {
      prs.push({ sport, metric: 'Most Calories', value: byCal[0].calories!, date: byCal[0].date, unit: 'cal' });
    }

    // Most elevation
    const byElev = acts.filter((a) => a.elevationGain > 0).sort((a, b) => b.elevationGain - a.elevationGain);
    if (byElev.length > 0) {
      prs.push({ sport, metric: 'Most Elevation', value: byElev[0].elevationGain, date: byElev[0].date, unit: 'm' });
    }
  }

  return prs;
}

// Sparkline data — rolling 60 calendar days
export function getSparklineData(
  wellness: WellnessDay[],
  metric: keyof WellnessDay
): number[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const filtered = wellness
    .filter(w => w.date >= cutoffStr && (w[metric] as number) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  return filtered.map((w) => (w[metric] as number) || 0);
}
