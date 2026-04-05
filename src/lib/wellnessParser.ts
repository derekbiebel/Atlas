import type { WellnessDay } from '../db/schema';

/**
 * Parse Garmin UDS (User Daily Summary) JSON files.
 * Contains steps, resting HR, and nested body battery / stress data.
 */
export function parseUDSJson(jsonText: string): WellnessDay[] {
  try {
    const data = JSON.parse(jsonText);
    if (!Array.isArray(data)) return [];

    const results: WellnessDay[] = [];
    for (const entry of data) {
      const date = entry.calendarDate;
      if (!date) continue;

      // Extract body battery from nested structure
      let bbStart: number | undefined;
      let bbEnd: number | undefined;
      let bbMin: number | undefined;
      const bbData = entry.bodyBattery;
      if (bbData && bbData.bodyBatteryStatList) {
        for (const stat of bbData.bodyBatteryStatList) {
          switch (stat.bodyBatteryStatType) {
            case 'HIGHEST': bbStart = stat.statsValue; break;
            case 'LOWEST': bbMin = stat.statsValue; break;
            case 'ENDOFDAY': case 'MOSTRECENT': bbEnd = stat.statsValue; break;
          }
        }
      }

      // Extract stress from nested structure
      let avgStress: number | undefined;
      const stressData = entry.allDayStress;
      if (stressData && stressData.aggregatorList) {
        const total = stressData.aggregatorList.find((a: any) => a.type === 'TOTAL');
        if (total) avgStress = total.averageStressLevel;
      }

      results.push({
        date,
        steps: entry.totalSteps ?? undefined,
        restingHR: entry.restingHeartRate ?? undefined,
        avgStress,
        bodyBatteryStart: bbStart,
        bodyBatteryEnd: bbEnd,
        bodyBatteryMin: bbMin,
        spo2avg: entry.averageSpo2 ?? undefined,
        respirationRate: entry.averageRespirationValue ?? undefined,
        intensityMinutes: (entry.moderateIntensityMinutes ?? 0) + (entry.vigorousIntensityMinutes ?? 0) || undefined,
        bodyWeight: entry.weight ? entry.weight / 1000 : undefined,
      });
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Parse Garmin Sleep JSON files.
 */
export function parseSleepJson(jsonText: string): WellnessDay[] {
  try {
    const data = JSON.parse(jsonText);
    if (!Array.isArray(data)) return [];

    const results: WellnessDay[] = [];
    for (const entry of data) {
      const date = entry.calendarDate;
      if (!date) continue;

      const totalSleep = (entry.deepSleepSeconds ?? 0) +
        (entry.lightSleepSeconds ?? 0) +
        (entry.remSleepSeconds ?? 0) +
        (entry.awakeSleepSeconds ?? 0);

      if (totalSleep === 0) continue;

      results.push({
        date,
        sleepDuration: Math.round(totalSleep / 60),
        sleepScore: entry.overallSleepScore ?? undefined,
        deepSleep: entry.deepSleepSeconds ? Math.round(entry.deepSleepSeconds / 60) : undefined,
        lightSleep: entry.lightSleepSeconds ? Math.round(entry.lightSleepSeconds / 60) : undefined,
        remSleep: entry.remSleepSeconds ? Math.round(entry.remSleepSeconds / 60) : undefined,
        awake: entry.awakeSleepSeconds ? Math.round(entry.awakeSleepSeconds / 60) : undefined,
      });
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Parse Garmin MetricsMaxMetData JSON files for VO2 Max.
 */
export function parseVO2MaxJson(jsonText: string): WellnessDay[] {
  try {
    const data = JSON.parse(jsonText);
    if (!Array.isArray(data)) return [];

    const results: WellnessDay[] = [];
    for (const entry of data) {
      const date = entry.calendarDate;
      const vo2 = entry.vo2MaxValue;
      if (!date || vo2 == null) continue;
      results.push({ date, vo2maxTrend: vo2 });
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Parse Garmin TrainingReadinessDTO JSON files for HRV and sleep scores.
 */
export function parseTrainingReadinessJson(jsonText: string): WellnessDay[] {
  try {
    const data = JSON.parse(jsonText);
    if (!Array.isArray(data)) return [];

    const results: WellnessDay[] = [];
    for (const entry of data) {
      const date = entry.calendarDate;
      if (!date) continue;

      const day: WellnessDay = { date };
      if (entry.hrvWeeklyAverage != null) day.hrv = entry.hrvWeeklyAverage;
      if (entry.sleepScore != null) day.sleepScore = entry.sleepScore;
      if (day.hrv !== undefined || day.sleepScore !== undefined) {
        results.push(day);
      }
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Merge wellness entries — combines data from multiple sources per date.
 */
export function mergeWellnessDays(days: WellnessDay[]): WellnessDay[] {
  const map = new Map<string, WellnessDay>();

  for (const day of days) {
    const existing = map.get(day.date);
    if (existing) {
      for (const key of Object.keys(day) as (keyof WellnessDay)[]) {
        if (day[key] !== undefined) {
          (existing as any)[key] = day[key];
        }
      }
    } else {
      map.set(day.date, { ...day });
    }
  }

  return Array.from(map.values());
}
