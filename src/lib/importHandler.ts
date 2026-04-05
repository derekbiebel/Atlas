import JSZip from 'jszip';
import { db } from '../db/schema';
import { parseFitFile } from './fitParser';
import { parseActivitiesCSV } from './csvParser';
import { parseUDSJson, parseSleepJson, parseVO2MaxJson, parseTrainingReadinessJson, mergeWellnessDays } from './wellnessParser';
import type { WellnessDay } from '../db/schema';

export interface ImportResult {
  totalFiles: number;
  activitiesImported: number;
  wellnessDays: number;
  dateRange: { min: string; max: string } | null;
  totalDistance: number;
  sports: string[];
}

interface ExtractedFiles {
  fitBuffers: { name: string; buffer: ArrayBuffer }[];
  csvTexts: string[];
  udsJsonTexts: string[];
  sleepJsonTexts: string[];
  vo2JsonTexts: string[];
  trainingReadinessJsonTexts: string[];
}

/**
 * Extract all files from a zip, including nested zips.
 */
async function extractFromZip(
  zip: JSZip,
  files: ExtractedFiles,
  onStatus?: (msg: string) => void
): Promise<void> {
  const entries = Object.entries(zip.files);

  for (const [path, entry] of entries) {
    if (entry.dir) continue;
    const lowerPath = path.toLowerCase();
    const fileName = path.split('/').pop() || path;

    if (lowerPath.endsWith('.fit')) {
      const buffer = await entry.async('arraybuffer');
      files.fitBuffers.push({ name: fileName, buffer });
    } else if (lowerPath.endsWith('.csv')) {
      const text = await entry.async('text');
      files.csvTexts.push(text);
    } else if (lowerPath.endsWith('.json')) {
      const text = await entry.async('text');
      if (lowerPath.includes('udsfile') || lowerPath.includes('userdailysummary')) {
        files.udsJsonTexts.push(text);
      } else if (lowerPath.includes('sleepdata') || lowerPath.includes('sleep_')) {
        files.sleepJsonTexts.push(text);
      } else if (lowerPath.includes('metricsmaxmet')) {
        files.vo2JsonTexts.push(text);
      } else if (lowerPath.includes('trainingreadiness')) {
        files.trainingReadinessJsonTexts.push(text);
      }
    } else if (lowerPath.endsWith('.zip')) {
      onStatus?.(`Extracting ${fileName}...`);
      const innerBuffer = await entry.async('arraybuffer');
      const innerZip = await JSZip.loadAsync(innerBuffer);
      await extractFromZip(innerZip, files, onStatus);
    }
  }
}

export async function importFiles(
  fileList: File[],
  onProgress: (current: number, total: number, status?: string) => void
): Promise<ImportResult> {
  const extracted: ExtractedFiles = {
    fitBuffers: [],
    csvTexts: [],
    udsJsonTexts: [],
    sleepJsonTexts: [],
    vo2JsonTexts: [],
    trainingReadinessJsonTexts: [],
  };

  onProgress(0, 0, 'Reading files...');

  for (const file of fileList) {
    const name = file.name.toLowerCase();

    if (name.endsWith('.zip')) {
      onProgress(0, 0, 'Extracting zip...');
      const zip = await JSZip.loadAsync(file);
      await extractFromZip(zip, extracted, (msg) => {
        onProgress(0, 0, msg);
      });
    } else if (name.endsWith('.fit')) {
      const buffer = await file.arrayBuffer();
      extracted.fitBuffers.push({ name: file.name, buffer });
    } else if (name.endsWith('.csv')) {
      const text = await file.text();
      extracted.csvTexts.push(text);
    } else if (name.endsWith('.json')) {
      const text = await file.text();
      const lower = file.name.toLowerCase();
      if (lower.includes('uds') || lower.includes('daily')) {
        extracted.udsJsonTexts.push(text);
      } else if (lower.includes('sleep')) {
        extracted.sleepJsonTexts.push(text);
      }
    }
  }

  let activitiesImported = 0;
  let wellnessDays = 0;
  let totalDistance = 0;
  const sports = new Set<string>();
  let minDate = 'Z';
  let maxDate = '';

  const totalWork = extracted.fitBuffers.length + extracted.csvTexts.length;
  let progress = 0;

  const foundParts: string[] = [];
  if (extracted.fitBuffers.length > 0) foundParts.push(`${extracted.fitBuffers.length.toLocaleString()} FIT files`);
  const wellnessFileCount = extracted.udsJsonTexts.length + extracted.sleepJsonTexts.length + extracted.vo2JsonTexts.length + extracted.trainingReadinessJsonTexts.length;
  if (wellnessFileCount > 0) foundParts.push(`${wellnessFileCount} wellness/health files`);
  onProgress(0, totalWork, `Found ${foundParts.join(', ')}`);

  // --- Process wellness JSON files ---
  console.log(`[Atlas] Processing ${extracted.udsJsonTexts.length} UDS files, ${extracted.sleepJsonTexts.length} sleep files`);
  const allWellnessDays: WellnessDay[] = [];

  for (const jsonText of extracted.udsJsonTexts) {
    const days = parseUDSJson(jsonText);
    console.log(`[Atlas] UDS file parsed: ${days.length} days, RHR sample: ${days[0]?.restingHR}`);
    allWellnessDays.push(...days);
  }

  for (const jsonText of extracted.sleepJsonTexts) {
    const days = parseSleepJson(jsonText);
    allWellnessDays.push(...days);
  }

  for (const jsonText of extracted.vo2JsonTexts) {
    const days = parseVO2MaxJson(jsonText);
    console.log(`[Atlas] VO2 file parsed: ${days.length} entries, sample: ${days[0]?.vo2maxTrend}`);
    allWellnessDays.push(...days);
  }

  for (const jsonText of extracted.trainingReadinessJsonTexts) {
    const days = parseTrainingReadinessJson(jsonText);
    console.log(`[Atlas] TrainingReadiness parsed: ${days.length} entries, HRV sample: ${days[0]?.hrv}`);
    allWellnessDays.push(...days);
  }

  if (allWellnessDays.length > 0) {
    const merged = mergeWellnessDays(allWellnessDays);
    await db.wellness.bulkPut(merged);
    wellnessDays = merged.length;
    console.log(`[Atlas] Imported ${wellnessDays} wellness days`);
  }

  // --- Process CSV files ---
  for (const csv of extracted.csvTexts) {
    const activities = parseActivitiesCSV(csv);

    if (activities.length > 0) {
      await db.activities.bulkPut(activities);
      activitiesImported += activities.length;

      for (const a of activities) {
        totalDistance += a.distance;
        sports.add(a.sport);
        if (a.date < minDate) minDate = a.date;
        if (a.date > maxDate) maxDate = a.date;
      }
    }

    progress++;
    onProgress(progress, totalWork);
  }

  // --- Process FIT files ---
  const batchSize = 10;
  for (let i = 0; i < extracted.fitBuffers.length; i += batchSize) {
    const batch = extracted.fitBuffers.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(({ name, buffer }) => parseFitFile(buffer, name))
    );

    const activities = results.filter((a): a is NonNullable<typeof a> => a !== null);

    if (activities.length > 0) {
      await db.activities.bulkPut(activities);
      activitiesImported += activities.length;

      for (const a of activities) {
        totalDistance += a.distance;
        sports.add(a.sport);
        if (a.date < minDate) minDate = a.date;
        if (a.date > maxDate) maxDate = a.date;
      }
    }

    progress += batch.length;
    onProgress(Math.min(progress, totalWork), totalWork);
    await new Promise((r) => setTimeout(r, 0));
  }

  console.log(`[Atlas] Import complete: ${activitiesImported} activities, ${wellnessDays} wellness days from ${totalWork} files`);

  return {
    totalFiles: totalWork,
    activitiesImported,
    wellnessDays,
    dateRange: minDate < 'Z' ? { min: minDate, max: maxDate } : null,
    totalDistance,
    sports: Array.from(sports).sort(),
  };
}
