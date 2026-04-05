import type { AtlasActivity } from '@/db/schema';
import { computeHRZoneBuckets } from '@/lib/metrics';
import { formatDuration } from '@/lib/units';

interface HRZoneChartProps {
  activities: AtlasActivity[];
}

const zoneColors = [
  'var(--atlas-sky)',      // Zone 1 — light blue
  'var(--atlas-sage)',     // Zone 2 — green
  'var(--atlas-peach)',    // Zone 3 — orange
  '#d07840',              // Zone 4 — darker orange
  'var(--atlas-teal)',    // Zone 5 — teal/dark
];

export function HRZoneChart({ activities }: HRZoneChartProps) {
  const zones = computeHRZoneBuckets(activities);
  const totalSeconds = zones.reduce((sum, z) => sum + z.seconds, 0);

  if (totalSeconds === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        No HR data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-8 rounded-lg overflow-hidden">
        {zones.map((z, i) => {
          const pct = (z.seconds / totalSeconds) * 100;
          if (pct < 0.5) return null;
          return (
            <div
              key={z.zone}
              className="flex items-center justify-center text-[10px] font-mono font-bold text-white transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: zoneColors[i],
                minWidth: pct > 3 ? undefined : '16px',
              }}
            >
              {pct >= 6 ? `${Math.round(pct)}%` : ''}
            </div>
          );
        })}
      </div>

      {/* Zone breakdown */}
      <div className="space-y-2">
        {zones.map((z, i) => {
          const pct = totalSeconds > 0 ? (z.seconds / totalSeconds) * 100 : 0;
          return (
            <div key={z.zone} className="flex items-center gap-3">
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: zoneColors[i] }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{z.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{formatDuration(z.seconds)}</span>
                    <span className="font-mono text-xs text-muted-foreground w-10 text-right">
                      {Math.round(pct)}%
                    </span>
                  </div>
                </div>
                <div className="h-1 bg-muted rounded-full mt-1">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: zoneColors[i],
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
        <span>Total time with HR data</span>
        <span className="font-mono font-medium text-foreground">{formatDuration(totalSeconds)}</span>
      </div>
    </div>
  );
}
