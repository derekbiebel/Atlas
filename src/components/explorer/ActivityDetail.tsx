import type { AtlasActivity } from '@/db/schema';
import { usePreferences } from '@/store/usePreferences';
import {
  formatDistance,
  distanceUnit,
  formatDuration,
  formatElevation,
  elevationUnit,
  formatPace,
  paceUnit,
} from '@/lib/units';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  Timer,
  Ruler,
  Mountain,
  Heart,
  HeartPulse,
  Flame,
  Gauge,
} from 'lucide-react';

interface ActivityDetailProps {
  activity: AtlasActivity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PACE_SPORTS = new Set(['running', 'trail_running', 'walking', 'hiking']);

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
}

function StatItem({ icon, label, value, unit }: StatItemProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-lg font-semibold text-foreground">
          {value}
        </span>
        {unit && (
          <span className="text-xs text-muted-foreground">{unit}</span>
        )}
      </div>
    </div>
  );
}

export function ActivityDetail({
  activity,
  open,
  onOpenChange,
}: ActivityDetailProps) {
  const { units } = usePreferences();

  if (!activity) return null;

  const dateFormatted = new Date(activity.date + 'T00:00:00').toLocaleDateString(
    'en-US',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  );

  const sportLabel = activity.sport
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const showPace = PACE_SPORTS.has(activity.sport.toLowerCase());

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle>{sportLabel}</SheetTitle>
            <Badge variant="secondary">{sportLabel}</Badge>
          </div>
          <SheetDescription>{dateFormatted}</SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-2 px-4">
          {activity.distance > 0 && (
            <StatItem
              icon={<Ruler className="size-3.5" />}
              label="Distance"
              value={formatDistance(activity.distance, units)}
              unit={distanceUnit(units)}
            />
          )}

          <StatItem
            icon={<Timer className="size-3.5" />}
            label="Duration"
            value={formatDuration(activity.duration)}
          />

          {activity.elevationGain > 0 && (
            <StatItem
              icon={<Mountain className="size-3.5" />}
              label="Elevation"
              value={formatElevation(activity.elevationGain, units)}
              unit={elevationUnit(units)}
            />
          )}

          {activity.avgHR != null && (
            <StatItem
              icon={<Heart className="size-3.5" />}
              label="Avg HR"
              value={String(Math.round(activity.avgHR))}
              unit="bpm"
            />
          )}

          {activity.maxHR != null && (
            <StatItem
              icon={<HeartPulse className="size-3.5" />}
              label="Max HR"
              value={String(activity.maxHR)}
              unit="bpm"
            />
          )}

          {activity.calories != null && (
            <StatItem
              icon={<Flame className="size-3.5" />}
              label="Calories"
              value={String(activity.calories)}
              unit="kcal"
            />
          )}

          {showPace && activity.avgPace != null && (
            <StatItem
              icon={<Gauge className="size-3.5" />}
              label="Avg Pace"
              value={formatPace(activity.avgPace, units)}
              unit={paceUnit(units)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
