import type { AtlasActivity } from '@/db/schema';
import { findPRs, type PRRecord } from '@/lib/metrics';
import { formatDuration, formatDistance, formatElevation, type UnitSystem } from '@/lib/units';
import { Badge } from '@/components/ui/badge';
import { Trophy, Ruler, Clock, Flame, Mountain } from 'lucide-react';

interface PRTimelineProps {
  activities: AtlasActivity[];
  units: UnitSystem;
}

function formatPRValue(pr: PRRecord, units: UnitSystem): string {
  switch (pr.metric) {
    case 'Longest Distance':
      return `${formatDistance(pr.value, units)} ${units === 'imperial' ? 'mi' : 'km'}`;
    case 'Longest Duration':
      return formatDuration(pr.value);
    case 'Most Calories':
      return `${Math.round(pr.value).toLocaleString()} cal`;
    case 'Most Elevation':
      return `${formatElevation(pr.value, units)} ${units === 'imperial' ? 'ft' : 'm'}`;
    default:
      return String(pr.value);
  }
}

function metricIcon(metric: string) {
  switch (metric) {
    case 'Longest Distance':
      return <Ruler className="size-3.5" />;
    case 'Longest Duration':
      return <Clock className="size-3.5" />;
    case 'Most Calories':
      return <Flame className="size-3.5" />;
    case 'Most Elevation':
      return <Mountain className="size-3.5" />;
    default:
      return <Trophy className="size-3.5" />;
  }
}

export function PRTimeline({ activities, units }: PRTimelineProps) {
  const prs = findPRs(activities);

  if (prs.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        No personal records found
      </div>
    );
  }

  // Group by sport
  const bySport = new Map<string, PRRecord[]>();
  for (const pr of prs) {
    const list = bySport.get(pr.sport) || [];
    list.push(pr);
    bySport.set(pr.sport, list);
  }

  return (
    <div className="space-y-5">
      {Array.from(bySport.entries()).map(([sport, records]) => (
        <div key={sport}>
          <div className="flex items-center gap-2 mb-2.5">
            <Badge variant="secondary" className="text-[11px] font-mono">
              {sport}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {records.map((pr) => (
              <div
                key={`${pr.sport}-${pr.metric}`}
                className="flex items-start gap-2.5 rounded-lg bg-muted/50 p-3"
              >
                <div className="mt-0.5 text-muted-foreground">{metricIcon(pr.metric)}</div>
                <div className="min-w-0">
                  <div className="text-[11px] text-muted-foreground">{pr.metric}</div>
                  <div className="font-mono font-semibold text-sm">
                    {formatPRValue(pr, units)}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(pr.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
