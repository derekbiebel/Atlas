import JSZip from 'jszip';
import { db } from '../db/schema';
import { parseFitFile } from './fitParser';
import { parseActivitiesCSV } from './csvParser';

export interface ImportResult {
  totalFiles: number;
  activitiesImported: number;
  dateRange: { min: string; max: string } | null;
  totalDistance: number;
  sports: string[];
}

export async function importFiles(
  files: File[],
  onProgress: (current: number, total: number) => void
): Promise<ImportResult> {
  const fitBuffers: { name: string; buffer: ArrayBuffer }[] = [];
  const csvTexts: string[] = [];

  for (const file of files) {
    const name = file.name.toLowerCase();

    if (name.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file);
      const entries = Object.entries(zip.files);
      for (const [path, entry] of entries) {
        if (!entry.dir && path.toLowerCase().endsWith('.fit')) {
          const buffer = await entry.async('arraybuffer');
          fitBuffers.push({ name: path.split('/').pop() || path, buffer });
        }
        if (!entry.dir && path.toLowerCase().endsWith('.csv')) {
          const text = await entry.async('text');
          csvTexts.push(text);
        }
      }
    } else if (name.endsWith('.fit')) {
      const buffer = await file.arrayBuffer();
      fitBuffers.push({ name: file.name, buffer });
    } else if (name.endsWith('.csv')) {
      const text = await file.text();
      csvTexts.push(text);
    }
  }

  let activitiesImported = 0;
  let totalDistance = 0;
  const sports = new Set<string>();
  let minDate = 'Z';
  let maxDate = '';

  const totalWork = fitBuffers.length + csvTexts.length;
  let progress = 0;
  onProgress(0, totalWork);

  // --- Process CSV files ---
  for (const csv of csvTexts) {
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
  const batchSize = 5;
  for (let i = 0; i < fitBuffers.length; i += batchSize) {
    const batch = fitBuffers.slice(i, i + batchSize);
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

  console.log(`[Atlas] Import complete: ${activitiesImported} activities from ${totalWork} files`);

  return {
    totalFiles: totalWork,
    activitiesImported,
    dateRange: minDate < 'Z' ? { min: minDate, max: maxDate } : null,
    totalDistance,
    sports: Array.from(sports).sort(),
  };
}
