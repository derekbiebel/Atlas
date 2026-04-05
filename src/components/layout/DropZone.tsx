import { useState, useRef } from 'react';
import { importFiles, type ImportResult } from '../../lib/importHandler';
import { useAtlasStore } from '../../store/useAtlasStore';
import { formatDistance, distanceUnit } from '../../lib/units';
import { usePreferences } from '../../store/usePreferences';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Upload, CheckCircle2, FileDown, AlertCircle } from 'lucide-react';

interface DropZoneProps {
  fullScreen?: boolean;
  onComplete?: (result: ImportResult) => void;
}

export function DropZone({ fullScreen = false, onComplete }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isImporting, importProgress, setImporting, setImportProgress } = useAtlasStore();
  const units = usePreferences((s) => s.units);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: File[]) => {
    setError(null);
    setImporting(true);
    setImportProgress({ current: 0, total: 0 });

    try {
      const importResult = await importFiles(files, (current, total, status) => {
        setImportProgress({ current, total });
        if (status) setStatusMsg(status);
      });

      setResult(importResult);
      setImporting(false);
      setImportProgress(null);

      if (importResult.activitiesImported === 0) {
        setError('No activities found. Make sure you are dropping .fit files, .csv, or a Garmin export .zip file.');
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

  // Success screen
  if (result && !error) {
    return (
      <div className={cn('flex flex-col items-center justify-center', fullScreen && 'fixed inset-0 bg-background z-50')}>
        <div className="text-center max-w-md w-full px-4">
          <CheckCircle2 className="size-14 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-1">Import Complete</h2>
          <p className="text-sm text-muted-foreground mb-6">{result.totalFiles.toLocaleString()} files scanned</p>

          <div className="grid grid-cols-2 gap-3 text-left">
            <Card>
              <CardContent className="pt-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Activities</p>
                <p className="font-mono text-2xl font-semibold mt-1">{result.activitiesImported.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Distance</p>
                <p className="font-mono text-2xl font-semibold mt-1">
                  {formatDistance(result.totalDistance, units)} <span className="text-sm text-muted-foreground">{distanceUnit(units)}</span>
                </p>
              </CardContent>
            </Card>
            {result.wellnessDays > 0 && (
              <Card className="col-span-2">
                <CardContent className="pt-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Wellness Data</p>
                  <p className="font-mono text-base font-semibold mt-1">
                    {result.wellnessDays.toLocaleString()} days of sleep, HR, and recovery data
                  </p>
                </CardContent>
              </Card>
            )}
            {result.dateRange && (
              <Card className="col-span-2">
                <CardContent className="pt-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Date Range</p>
                  <p className="font-mono text-base font-semibold mt-1">
                    {result.dateRange.min} → {result.dateRange.max}
                  </p>
                </CardContent>
              </Card>
            )}
            {result.sports.length > 0 && (
              <Card className="col-span-2">
                <CardContent className="pt-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Sports</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.sports.map((s) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Button onClick={() => onComplete?.(result)} size="lg" className="mt-8 w-full">
            View Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Drop zone
  return (
    <div
      className={cn('flex flex-col items-center justify-center', fullScreen && 'fixed inset-0 bg-background z-50')}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div
        className={cn(
          'border-2 border-dashed rounded-2xl p-16 text-center transition-all max-w-lg w-full',
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-primary/50'
        )}
      >
        {isImporting ? (
          <div>
            <FileDown className="size-10 text-primary mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-bold mb-2">
              {importProgress && importProgress.total > 0 ? 'Processing...' : 'Extracting...'}
            </h2>
            {statusMsg && (
              <p className="text-xs text-muted-foreground mb-2">{statusMsg}</p>
            )}
            {importProgress && importProgress.total > 0 && (
              <div>
                <p className="font-mono text-sm text-muted-foreground">
                  {importProgress.current.toLocaleString()} / {importProgress.total.toLocaleString()} files
                </p>
                <div className="mt-4 w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {fullScreen && (
              <h1 className="text-4xl font-bold tracking-tight mb-1">ATLAS</h1>
            )}
            <Upload className="size-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">
              {fullScreen ? 'Drop your Garmin export here' : 'Add More Data'}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Drop .fit files, .csv, or a Garmin export .zip
            </p>
            <label className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 h-8 text-sm font-medium cursor-pointer hover:bg-primary/90 transition-colors">
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
            <p className="text-[11px] text-muted-foreground/60 mt-6">
              All data is stored locally and not shared anywhere.
            </p>
            {fullScreen && (
              <p className="text-xs text-muted-foreground mt-3">
                Garmin Connect → Profile → Account Settings → Data Management → Export Your Data
              </p>
            )}
            {error && (
              <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive text-left flex gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
