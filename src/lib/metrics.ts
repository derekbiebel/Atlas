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

// Sparkline data (last 30 days)
export function getSparklineData(
  wellness: WellnessDay[],
  metric: keyof WellnessDay
): number[] {
  const sorted = [...wellness].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.slice(-30).map((w) => (w[metric] as number) || 0);
}
