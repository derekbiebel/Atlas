import { useEffect, useMemo, useState, useCallback } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActivityDetail } from '@/components/explorer/ActivityDetail';
import { useAtlasStore } from '@/store/useAtlasStore';
import { usePreferences } from '@/store/usePreferences';
import { getActivitiesInRange, getAllSports } from '@/db/queries';
import type { AtlasActivity } from '@/db/schema';
import {
  formatDistance,
  distanceUnit,
  formatDuration,
} from '@/lib/units';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Activity,
  Ruler,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SortKey = 'date' | 'sport' | 'distance' | 'duration' | 'avgHR' | 'calories';
type SortDir = 'asc' | 'desc';

function getSortValue(a: AtlasActivity, key: SortKey): number | string {
  switch (key) {
    case 'date':
      return a.timestamp;
    case 'sport':
      return a.sport;
    case 'distance':
      return a.distance;
    case 'duration':
      return a.duration;
    case 'avgHR':
      return a.avgHR ?? 0;
    case 'calories':
      return a.calories ?? 0;
  }
}

export function Explorer() {
  const { startDate, endDate } = useAtlasStore();
  const { units } = usePreferences();

  const [activities, setActivities] = useState<AtlasActivity[]>([]);
  const [allSports, setAllSports] = useState<string[]>([]);
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedActivity, setSelectedActivity] = useState<AtlasActivity | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    getActivitiesInRange(startDate, endDate).then(setActivities);
    getAllSports().then(setAllSports);
  }, [startDate, endDate]);

  const filtered = useMemo(() => {
    if (sportFilter === 'all') return activities;
    return activities.filter((a) => a.sport === sportFilter);
  }, [activities, sportFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      const diff = (aVal as number) - (bVal as number);
      return sortDir === 'asc' ? diff : -diff;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('desc');
      }
    },
    [sortKey]
  );

  const handleRowClick = useCallback((activity: AtlasActivity) => {
    setSelectedActivity(activity);
    setDetailOpen(true);
  }, []);

  // Stats summary
  const totalActivities = filtered.length;
  const totalDistance = filtered.reduce((sum, a) => sum + a.distance, 0);
  const avgDuration =
    totalActivities > 0
      ? filtered.reduce((sum, a) => sum + a.duration, 0) / totalActivities
      : 0;

  const sportCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of activities) {
      counts.set(a.sport, (counts.get(a.sport) ?? 0) + 1);
    }
    return counts;
  }, [activities]);

  return (
    <div>
      <TopBar title="Activity Explorer" />

      <div className="p-6 space-y-4">
        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card size="sm">
            <CardContent className="flex items-center gap-3">
              <Activity className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total Activities</p>
                <p className="font-mono text-lg font-semibold">{totalActivities}</p>
              </div>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="flex items-center gap-3">
              <Ruler className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total Distance</p>
                <p className="font-mono text-lg font-semibold">
                  {formatDistance(totalDistance, units)}{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    {distanceUnit(units)}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="flex items-center gap-3">
              <Timer className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Duration</p>
                <p className="font-mono text-lg font-semibold">
                  {avgDuration > 0 ? formatDuration(Math.round(avgDuration)) : '--'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sport filter pills */}
        {allSports.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setSportFilter('all')}>
              <Badge variant={sportFilter === 'all' ? 'default' : 'outline'}>
                All ({activities.length})
              </Badge>
            </button>
            {allSports.map((sport) => {
              const label = sport
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase());
              return (
                <button key={sport} onClick={() => setSportFilter(sport)}>
                  <Badge
                    variant={sportFilter === sport ? 'default' : 'outline'}
                  >
                    {label} ({sportCounts.get(sport) ?? 0})
                  </Badge>
                </button>
              );
            })}
          </div>
        )}

        {/* Activities table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <SortHeader
                      label="Date"
                      sortKey="date"
                      currentKey={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Sport"
                      sortKey="sport"
                      currentKey={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Distance"
                      sortKey="distance"
                      currentKey={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                      className="text-right"
                    />
                    <SortHeader
                      label="Duration"
                      sortKey="duration"
                      currentKey={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                      className="text-right"
                    />
                    <SortHeader
                      label="Avg HR"
                      sortKey="avgHR"
                      currentKey={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                      className="text-right"
                    />
                    <SortHeader
                      label="Calories"
                      sortKey="calories"
                      currentKey={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                      className="text-right"
                    />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((a) => {
                    const dateStr = new Date(
                      a.date + 'T00:00:00'
                    ).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    const sportLabel = a.sport
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (c) => c.toUpperCase());
                    return (
                      <tr
                        key={a.id}
                        onClick={() => handleRowClick(a)}
                        className="border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/50"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs">
                          {dateStr}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant="secondary" className="text-[11px]">
                            {sportLabel}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {a.distance > 0
                            ? `${formatDistance(a.distance, units)} ${distanceUnit(units)}`
                            : '--'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {formatDuration(a.duration)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {a.avgHR != null ? Math.round(a.avgHR) : '--'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {a.calories ?? '--'}
                        </td>
                      </tr>
                    );
                  })}
                  {sorted.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-muted-foreground"
                      >
                        No activities found in the selected range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <ActivityDetail
        activity={selectedActivity}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}

function SortHeader({
  label,
  sortKey: key,
  currentKey,
  currentDir,
  onSort,
  className,
}: SortHeaderProps) {
  const isActive = currentKey === key;
  return (
    <th
      className={cn(
        'px-4 py-2.5 font-medium cursor-pointer select-none hover:text-foreground transition-colors',
        className
      )}
      onClick={() => onSort(key)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === 'asc' ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-30" />
        )}
      </span>
    </th>
  );
}
