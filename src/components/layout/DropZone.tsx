import { useState, useRef } from 'react';
import { importFiles, type ImportResult } from '../../lib/importHandler';
import { useAtlasStore } from '../../store/useAtlasStore';
import { formatDistance, distanceUnit } from '../../lib/units';
import { usePreferences } from '../../store/usePreferences';

interface DropZoneProps {
  fullScreen?: boolean;
  onComplete?: (result: ImportResult) => void;
}

export function DropZone({ fullScreen = false, onComplete }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isImporting, importProgress, setImporting, setImportProgress } = useAtlasStore();
  const units = usePreferences((s) => s.units);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: File[]) => {
    setError(null);
    setImporting(true);
    setImportProgress({ current: 0, total: 0 });

    try {
      const importResult = await importFiles(files, (current, total) => {
        setImportProgress({ current, total });
      });

      setResult(importResult);
      setImporting(false);
      setImportProgress(null);

      if (importResult.activitiesImported === 0) {
        setError('No activities found. Make sure you are dropping .fit files or a Garmin export .zip file.');
      }
    } catch (err) {
      console.error('Import failed:', err);
      setError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setImporting(false);
      setImportProgress(null);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    await processFiles(files);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await processFiles(files);
  };

  if (result && !error) {
    return (
      <div className={`flex flex-col items-center justify-center ${fullScreen ? 'fixed inset-0 bg-[var(--bg)] z-50' : 'p-12'}`}>
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Import Complete</h2>
          <div className="grid grid-cols-2 gap-4 mt-6 text-left">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
              <p className="text-xs text-[var(--text3)] uppercase tracking-wider">Activities</p>
              <p className="font-mono text-xl font-semibold mt-1">{result.activitiesImported.toLocaleString()}</p>
              <p className="text-[10px] text-[var(--text3)] mt-0.5">{result.totalFiles.toLocaleString()} FIT files scanned</p>
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
              <p className="text-xs text-[var(--text3)] uppercase tracking-wider">Total Distance</p>
              <p className="font-mono text-xl font-semibold mt-1">
                {formatDistance(result.totalDistance, units)} {distanceUnit(units)}
              </p>
            </div>
            {result.dateRange && (
              <div className="col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
                <p className="text-xs text-[var(--text3)] uppercase tracking-wider">Date Range</p>
                <p className="font-mono text-base font-semibold mt-1">
                  {result.dateRange.min} → {result.dateRange.max}
                </p>
              </div>
            )}
            {result.sports.length > 0 && (
              <div className="col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4">
                <p className="text-xs text-[var(--text3)] uppercase tracking-wider">Sports</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {result.sports.map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-[var(--primary-light)] text-[var(--primary-text)] text-xs font-mono rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => onComplete?.(result)}
            className="mt-8 px-6 py-3 bg-[var(--primary-text)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            View Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center ${fullScreen ? 'fixed inset-0 bg-[var(--bg)] z-50' : 'p-12'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div
        className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all max-w-lg w-full ${
          isDragging
            ? 'border-[var(--primary-text)] bg-[var(--primary-light)] scale-[1.02]'
            : 'border-[var(--border2)] hover:border-[var(--primary)]'
        }`}
      >
        {isImporting ? (
          <div>
            <div className="text-4xl mb-4 animate-pulse">⚡</div>
            <h2 className="text-xl font-bold text-[var(--text)] mb-2">Processing...</h2>
            {importProgress && (
              <div>
                <p className="font-mono text-sm text-[var(--text3)]">
                  Processed {importProgress.current.toLocaleString()} / {importProgress.total.toLocaleString()} files
                </p>
                <div className="mt-4 w-full bg-[var(--surface2)] rounded-full h-2">
                  <div
                    className="bg-[var(--primary-text)] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {fullScreen && (
              <h1 className="text-4xl font-bold tracking-tight text-[var(--text)] mb-2">ATLAS</h1>
            )}
            <div className="text-4xl mb-4">↓</div>
            <h2 className="text-xl font-bold text-[var(--text)] mb-2">
              {fullScreen ? 'Drop your Garmin export here' : 'Add More Data'}
            </h2>
            <p className="text-sm text-[var(--text3)] mb-6">
              Drop .fit files, .csv, or a Garmin export .zip
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary-text)] text-white rounded-lg text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity">
              Browse Files
              <input
                ref={fileInputRef}
                type="file"
                accept=".fit,.zip,.csv"
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
            {fullScreen && (
              <p className="text-xs text-[var(--text3)] mt-6">
                Garmin Connect → Profile → Account Settings → Data Management → Export Your Data
              </p>
            )}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 text-left">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
