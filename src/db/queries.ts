import { db, type AtlasActivity, type WellnessDay } from './schema';

export async function getActivitiesInRange(
  startDate: string,
  endDate: string,
  sport?: string
): Promise<AtlasActivity[]> {
  let query = db.activities.where('date').between(startDate, endDate, true, true);
  const results = await query.toArray();
  if (sport && sport !== 'all') {
    return results.filter((a) => a.sport === sport);
  }
  return results;
}

export async function getWellnessInRange(
  startDate: string,
  endDate: string
): Promise<WellnessDay[]> {
  return db.wellness.where('date').between(startDate, endDate, true, true).toArray();
}

export async function getAllSports(): Promise<string[]> {
  const activities = await db.activities.toArray();
  const sports = new Set(activities.map((a) => a.sport));
  return Array.from(sports).sort();
}

export async function getDateRange(): Promise<{ min: string; max: string } | null> {
  const first = await db.activities.orderBy('date').first();
  const last = await db.activities.orderBy('date').last();
  if (!first || !last) return null;
  return { min: first.date, max: last.date };
}

export async function getActivityCount(): Promise<number> {
  return db.activities.count();
}

export async function getTotalDistance(): Promise<number> {
  const activities = await db.activities.toArray();
  return activities.reduce((sum, a) => sum + (a.distance || 0), 0);
}

export function getYoYDate(date: string, period: 'YoY' | 'MoM' | 'WoW'): string {
  const d = new Date(date);
  switch (period) {
    case 'YoY':
      d.setFullYear(d.getFullYear() - 1);
      break;
    case 'MoM':
      d.setMonth(d.getMonth() - 1);
      break;
    case 'WoW':
      d.setDate(d.getDate() - 7);
      break;
  }
  return d.toISOString().slice(0, 10);
}
