import Dexie, { type EntityTable } from 'dexie';

export interface AtlasActivity {
  id: string;
  timestamp: number;
  date: string; // YYYY-MM-DD
  sport: string;
  subSport?: string;
  duration: number; // seconds
  distance: number; // meters
  elevationGain: number; // meters
  avgHR?: number;
  maxHR?: number;
  avgPace?: number; // sec/km
  bestPace?: number;
  calories?: number;
  hrZones?: number[]; // time in each zone (5 zones)
  cadence?: number;
  power?: number;
  vo2maxEstimate?: number;
  trainingEffect?: number;
  lapSplits?: LapSplit[];
  hrTimeseries?: TimeseriesPoint[];
  paceTimeseries?: TimeseriesPoint[];
  altitudeTimeseries?: TimeseriesPoint[];
  tempTimeseries?: TimeseriesPoint[];
}

export interface LapSplit {
  lapNumber: number;
  distance: number;
  duration: number;
  avgHR?: number;
  avgPace?: number;
}

export interface TimeseriesPoint {
  elapsed: number;
  value: number;
}

export interface WellnessDay {
  date: string; // YYYY-MM-DD
  steps?: number;
  restingHR?: number;
  avgStress?: number;
  bodyBatteryStart?: number;
  bodyBatteryEnd?: number;
  bodyBatteryMin?: number;
  sleepDuration?: number; // minutes
  sleepScore?: number;
  deepSleep?: number;
  lightSleep?: number;
  remSleep?: number;
  awake?: number;
  hrv?: number;
  spo2avg?: number;
  respirationRate?: number;
  intensityMinutes?: number;
  vo2maxTrend?: number;
  bodyWeight?: number;
}

class AtlasDatabase extends Dexie {
  activities!: EntityTable<AtlasActivity, 'id'>;
  wellness!: EntityTable<WellnessDay, 'date'>;

  constructor() {
    super('AtlasDB');
    this.version(1).stores({
      activities: 'id, timestamp, date, sport',
      wellness: 'date',
    });
  }
}

export const db = new AtlasDatabase();
