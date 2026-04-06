import { useState } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { usePreferences } from '../store/usePreferences';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { db } from '../db/schema';
import { Trash2, ExternalLink } from 'lucide-react';

export function Settings() {
  const { units, setUnits, themeMode, themePreset, setTheme } = usePreferences();


  return (
    <div>
      <TopBar title="Settings" />
      <div className="p-6 max-w-2xl space-y-8">
        {/* Get Your Data */}
        <section>
          <h3 className="text-sm font-semibold mb-4">Get Your Data</h3>
          <Card>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">Export from Garmin Connect</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Request your full data export including .FIT files, wellness, and sleep data. Garmin will email you a download link (usually within 24-48 hours).
                </p>
              </div>
              <a
                href="https://www.garmin.com/en-US/account/datamanagement/exportdata/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ExternalLink className="size-3.5" />
                  Request Garmin Data Export
                </Button>
              </a>
            </CardContent>
          </Card>
        </section>

        {/* Units */}
        <section>
          <h3 className="text-sm font-semibold mb-4">Units</h3>
          <Card>
            <CardContent className="space-y-0 divide-y">
              {([
                { label: 'Distance', imperial: 'Miles', metric: 'Kilometers' },
                { label: 'Pace', imperial: 'min/mile', metric: 'min/km' },
                { label: 'Speed', imperial: 'mph', metric: 'kph' },
                { label: 'Elevation', imperial: 'Feet', metric: 'Meters' },
                { label: 'Weight', imperial: 'lbs', metric: 'kg' },
                { label: 'Temperature', imperial: '°F', metric: '°C' },
              ]).map((row) => (
                <div key={row.label} className="flex items-center justify-between py-3">
                  <span className="text-sm">{row.label}</span>
                  <div className="flex bg-secondary rounded-lg p-0.5">
                    <button
                      onClick={() => setUnits('imperial')}
                      className={cn(
                        'px-3 py-1 text-xs font-mono rounded-md transition-colors',
                        units === 'imperial'
                          ? 'bg-card text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {row.imperial}
                    </button>
                    <button
                      onClick={() => setUnits('metric')}
                      className={cn(
                        'px-3 py-1 text-xs font-mono rounded-md transition-colors',
                        units === 'metric'
                          ? 'bg-card text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {row.metric}
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Appearance */}
        <section>
          <h3 className="text-sm font-semibold mb-4">Appearance</h3>
          <Card>
            <CardContent className="space-y-6">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mode</label>
                <div className="flex gap-2 mt-2">
                  {(['light', 'dark', 'system'] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={themeMode === mode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme({ themeMode: mode })}
                      className="capitalize"
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Theme Preset</label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {['linen', 'slate', 'parchment', 'fog', 'graphite', 'midnight', 'forest', 'rose'].map((preset) => (
                    <Button
                      key={preset}
                      variant={themePreset === preset ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme({ themePreset: preset })}
                      className="capitalize"
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Data Management */}
        <DataManagement />

      </div>
    </div>
  );
}

function DataManagement() {
  const [csvCount, setCsvCount] = useState<number | null>(null);
  const [fitCount, setFitCount] = useState<number | null>(null);
  const [wellnessCount, setWellnessCount] = useState<number | null>(null);
  const [wellnessSample, setWellnessSample] = useState<string>('');
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  // Count on mount
  useState(() => {
    db.activities.toArray().then((all) => {
      setCsvCount(all.filter(a => a.id.startsWith('csv-')).length);
      setFitCount(all.filter(a => !a.id.startsWith('csv-')).length);
    });
    db.wellness.count().then(setWellnessCount);
    db.wellness.limit(3).toArray().then((rows) => {
      if (rows.length > 0) {
        const parts = rows.map(r => {
          const fields: string[] = [];
          if (r.restingHR) fields.push(`RHR:${r.restingHR}`);
          if (r.sleepDuration) fields.push(`Sleep:${r.sleepDuration}min`);
          if (r.hrv) fields.push(`HRV:${r.hrv}`);
          if (r.steps) fields.push(`Steps:${r.steps}`);
          return `${r.date} (${fields.join(', ') || 'empty'})`;
        });
        setWellnessSample(parts.join(' | '));
      } else {
        setWellnessSample('No wellness data in database');
      }
    });
  });

  const handleClearCSV = async () => {
    setClearing(true);
    const all = await db.activities.toArray();
    const csvIds = all.filter(a => a.id.startsWith('csv-')).map(a => a.id);
    await db.activities.bulkDelete(csvIds);
    setCsvCount(0);
    setClearing(false);
    setCleared(true);
  };

  const handleClearAll = async () => {
    setClearing(true);
    await db.activities.clear();
    await db.wellness.clear();
    setCsvCount(0);
    setFitCount(0);
    setClearing(false);
    setCleared(true);
  };

  return (
    <section>
      <h3 className="text-sm font-semibold mb-4">Data Management</h3>
      <Card>
        <CardContent className="space-y-4">
          <div className="py-1 space-y-2">
            <div>
              <p className="text-sm font-medium">Activity data</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {csvCount !== null && fitCount !== null
                  ? `${fitCount} FIT activities, ${csvCount} CSV activities`
                  : 'Loading...'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Wellness data</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {wellnessCount !== null ? `${wellnessCount} days` : 'Loading...'}
              </p>
              {wellnessSample && (
                <p className="text-[10px] font-mono text-muted-foreground mt-1 break-all">
                  {wellnessSample}
                </p>
              )}
            </div>
          </div>

          {cleared && (
            <div className="text-xs text-emerald-600 font-medium bg-emerald-50 rounded-lg px-3 py-2">
              Data cleared. Refresh the page to update all views.
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Clear CSV data</p>
              <p className="text-xs text-muted-foreground">Remove synthetic activities from CSV imports. Keeps real FIT data.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCSV}
              disabled={clearing || csvCount === 0}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Clear CSV ({csvCount ?? 0})
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Clear all data</p>
              <p className="text-xs text-muted-foreground">Remove all activities and wellness data. Cannot be undone.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={clearing}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
