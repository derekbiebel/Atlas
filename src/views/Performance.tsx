import { useEffect, useState } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FitnessChart } from '@/components/charts/FitnessChart';
import { HRZoneChart } from '@/components/charts/HRZoneChart';
import { PRTimeline } from '@/components/charts/PRTimeline';
import { StressRecoveryScatter } from '@/components/charts/StressRecoveryScatter';
import { useAtlasStore } from '@/store/useAtlasStore';
import { usePreferences } from '@/store/usePreferences';
import { getActivitiesInRange } from '@/db/queries';
import type { AtlasActivity } from '@/db/schema';
import { Activity, Heart, Trophy, Zap } from 'lucide-react';

export function Performance() {
  const { startDate, endDate, activeSport } = useAtlasStore();
  const units = usePreferences((s) => s.units);
  const [activities, setActivities] = useState<AtlasActivity[]>([]);

  useEffect(() => {
    getActivitiesInRange(startDate, endDate, activeSport).then(setActivities);
  }, [startDate, endDate, activeSport]);

  return (
    <div>
      <TopBar title="Performance Hub" subtitle={`${activities.length} activities`} />
      <div className="p-6 space-y-5">
        {/* Fitness / Training Load Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4 text-[var(--atlas-sky)]" />
              Training Load
            </CardTitle>
            <CardDescription>
              Fitness (CTL), Fatigue (ATL), and Form (TSB) over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FitnessChart
              activities={activities}
              startDate={startDate}
              endDate={endDate}
            />
          </CardContent>
        </Card>

        {/* HR Zone Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="size-4 text-[var(--atlas-peach)]" />
              Heart Rate Zones
            </CardTitle>
            <CardDescription>
              Time distribution across HR zones based on average heart rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HRZoneChart activities={activities} />
          </CardContent>
        </Card>

        {/* Personal Records */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-4 text-[var(--atlas-peach)]" />
              Personal Records
            </CardTitle>
            <CardDescription>
              Best performances per sport in the selected date range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PRTimeline activities={activities} units={units} />
          </CardContent>
        </Card>
        {/* Stress / Recovery Scatter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="size-4 text-[var(--atlas-sky)]" />
              Stress / Recovery
            </CardTitle>
            <CardDescription>
              Training load vs heart rate response per activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StressRecoveryScatter activities={activities} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
