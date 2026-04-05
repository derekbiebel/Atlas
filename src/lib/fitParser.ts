import FitParser from 'fit-file-parser';
import type { AtlasActivity } from '../db/schema';

// Parse a single FIT file buffer into an AtlasActivity
export async function parseFitFile(buffer: ArrayBuffer, fileName: string): Promise<AtlasActivity | null> {
  try {
    const fitParser = new FitParser({
      force: true,
      speedUnit: 'm/s',
      lengthUnit: 'm',
      temperatureUnit: 'celsius',
      elapsedRecordField: true,
      mode: 'list',
    });

    const parsed: any = await new Promise((resolve, reject) => {
      fitParser.parse(buffer, (error: any, data: any) => {
        if (error) reject(error);
        else resolve(data);
      });
    });

    // Skip files that aren't activities (wellness, settings, device, etc.)
    if (!parsed || !parsed.sessions || parsed.sessions.length === 0) {
      return null;
    }

    const session = parsed.sessions[0];
    const records = parsed.records || [];

    // Need at least a timestamp to be useful
    const rawTimestamp = session.start_time || session.timestamp;
    if (!rawTimestamp) return null;

    const timestamp = new Date(rawTimestamp).getTime();
    if (isNaN(timestamp)) return null;

    const date = new Date(timestamp).toISOString().slice(0, 10);

    // Build timeseries from records
    const hrTimeseries: { elapsed: number; value: number }[] = [];
    const paceTimeseries: { elapsed: number; value: number }[] = [];
    const altitudeTimeseries: { elapsed: number; value: number }[] = [];

    for (const rec of records) {
      const elapsed = rec.elapsed_time || 0;
      if (rec.heart_rate) hrTimeseries.push({ elapsed, value: rec.heart_rate });
      if (rec.speed) paceTimeseries.push({ elapsed, value: rec.speed > 0 ? 1000 / rec.speed : 0 });
      if (rec.altitude != null) altitudeTimeseries.push({ elapsed, value: rec.altitude });
    }

    // Parse laps
    const lapSplits = (parsed.laps || []).map((lap: any, i: number) => ({
      lapNumber: i + 1,
      distance: lap.total_distance || 0,
      duration: lap.total_timer_time || 0,
      avgHR: lap.avg_heart_rate,
      avgPace: lap.enhanced_avg_speed ? 1000 / lap.enhanced_avg_speed : undefined,
    }));

    // HR zones (if available from session)
    const hrZones = session.time_in_hr_zone
      ? session.time_in_hr_zone.slice(0, 5)
      : undefined;

    const activity: AtlasActivity = {
      id: `${timestamp}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
      timestamp,
      date,
      sport: mapSport(session.sport || 'generic'),
      subSport: session.sub_sport,
      duration: session.total_timer_time || session.total_elapsed_time || 0,
      distance: session.total_distance || 0,
      elevationGain: session.total_ascent || 0,
      avgHR: session.avg_heart_rate,
      maxHR: session.max_heart_rate,
      avgPace: session.enhanced_avg_speed ? 1000 / session.enhanced_avg_speed : undefined,
      bestPace: session.enhanced_max_speed ? 1000 / session.enhanced_max_speed : undefined,
      calories: session.total_calories,
      hrZones,
      cadence: session.avg_running_cadence || session.avg_cadence,
      power: session.avg_power,
      vo2maxEstimate: session.enhanced_avg_respiration_rate,
      trainingEffect: session.total_training_effect,
      lapSplits,
      hrTimeseries: hrTimeseries.length > 0 ? hrTimeseries : undefined,
      paceTimeseries: paceTimeseries.length > 0 ? paceTimeseries : undefined,
      altitudeTimeseries: altitudeTimeseries.length > 0 ? altitudeTimeseries : undefined,
    };

    return activity;
  } catch (err) {
    // Many FIT files in Garmin exports aren't activities — this is expected
    return null;
  }
}

function mapSport(sport: string): string {
  const mapping: Record<string, string> = {
    running: 'Running',
    cycling: 'Cycling',
    swimming: 'Swimming',
    walking: 'Walking',
    hiking: 'Hiking',
    training: 'Strength',
    fitness_equipment: 'Gym',
    generic: 'Other',
    transition: 'Transition',
    cardio_training: 'Cardio',
    breathwork: 'Breathwork',
    yoga: 'Yoga',
    pilates: 'Pilates',
    elliptical: 'Elliptical',
    stair_climbing: 'Stairs',
    indoor_cycling: 'Indoor Cycling',
    lap_swimming: 'Swimming',
    open_water_swimming: 'Open Water',
    rowing: 'Rowing',
    stand_up_paddleboarding: 'SUP',
    surfing: 'Surfing',
    cross_country_skiing: 'XC Skiing',
    alpine_skiing: 'Skiing',
    snowboarding: 'Snowboarding',
    golf: 'Golf',
    tennis: 'Tennis',
    basketball: 'Basketball',
    soccer: 'Soccer',
    rock_climbing: 'Climbing',
  };
  return mapping[sport.toLowerCase()] || sport.charAt(0).toUpperCase() + sport.slice(1).toLowerCase().replace(/_/g, ' ');
}
