import { useState, useEffect, useMemo } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { StatCard } from '../components/ui/StatCard';
import { WeeklyDistanceChart } from '../components/charts/WeeklyDistanceChart';
import { YearHeatmap } from '../components/charts/YearHeatmap';
import { useAtlasStore } from '../store/useAtlasStore';
import { usePreferences } from '../store/usePreferences';
import { getActivitiesInRange, getWellnessInRange, getYoYDate } from '../db/queries';
import { aggregateByWeek, estimateTSS, getSparklineData } from '../lib/metrics';
import { formatDistance, distanceUnit, formatElevation, elevationUnit } from '../lib/units';
import type { AtlasActivity, WellnessDay } from '../db/schema';

export function Dashboard() {
  const { startDate, endDate, activeSport } = useAtlasStore();
  const { units, cards, charts, toggleCard, setChartComparison } = usePreferences();
  const [customizing, setCustomizing] = useState(false);

  const [activities, setActivities] = useState<AtlasActivity[]>([]);
  const [compActivities, setCompActivities] = useState<AtlasActivity[]>([]);
  const [wellness, setWellness] = useState<WellnessDay[]>([]);
  const [compWellness, setCompWellness] = useState<WellnessDay[]>([]);

  const [heatmapMetric, setHeatmapMetric] = useState<'load' | 'sleep' | 'hrv'>('load');

  useEffect(() => {
    getActivitiesInRange(startDate, endDate, activeSport).then(setActivities);
    getWellnessInRange(startDate, endDate).then(setWellness);

    // Get comparison data (YoY by default)
    const compStart = getYoYDate(startDate, 'YoY');
    const compEnd = getYoYDate(endDate, 'YoY');
    getActivitiesInRange(compStart, compEnd, activeSport).then(setCompActivities);
    getWellnessInRange(compStart, compEnd).then(setCompWellness);
  }, [startDate, endDate, activeSport]);

  // Computed stats
  const stats = useMemo(() => {
    const totalDist = activities.reduce((sum, a) => sum + a.distance, 0);
    const compTotalDist = compActivities.reduce((sum, a) => sum + a.distance, 0);
    const totalElev = activities.reduce((sum, a) => sum + a.elevationGain, 0);
    const compTotalElev = compActivities.reduce((sum, a) => sum + a.elevationGain, 0);

    const avgRHR = wellness.filter((w) => w.restingHR).reduce((sum, w) => sum + (w.restingHR || 0), 0) / (wellness.filter((w) => w.restingHR).length || 1);
    const compAvgRHR = compWellness.filter((w) => w.restingHR).reduce((sum, w) => sum + (w.restingHR || 0), 0) / (compWellness.filter((w) => w.restingHR).length || 1);

    const avgHRV = wellness.filter((w) => w.hrv).reduce((sum, w) => sum + (w.hrv || 0), 0) / (wellness.filter((w) => w.hrv).length || 1);
    const compAvgHRV = compWellness.filter((w) => w.hrv).reduce((sum, w) => sum + (w.hrv || 0), 0) / (compWellness.filter((w) => w.hrv).length || 1);

    const avgSleep = wellness.filter((w) => w.sleepScore).reduce((sum, w) => sum + (w.sleepScore || 0), 0) / (wellness.filter((w) => w.sleepScore).length || 1);
    const compAvgSleep = compWellness.filter((w) => w.sleepScore).reduce((sum, w) => sum + (w.sleepScore || 0), 0) / (compWellness.filter((w) => w.sleepScore).length || 1);

    const avgBB = wellness.filter((w) => w.bodyBatteryEnd).reduce((sum, w) => sum + (w.bodyBatteryEnd || 0), 0) / (wellness.filter((w) => w.bodyBatteryEnd).length || 1);

    const vo2Values = wellness.filter((w) => w.vo2maxTrend).map((w) => w.vo2maxTrend!);
    const latestVO2 = vo2Values.length > 0 ? vo2Values[vo2Values.length - 1] : 0;
    const compVO2Values = compWellness.filter((w) => w.vo2maxTrend).map((w) => w.vo2maxTrend!);
    const compLatestVO2 = compVO2Values.length > 0 ? compVO2Values[compVO2Values.length - 1] : 0;

    // Weekly distance for current week
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const thisWeekActivities = activities.filter(a => a.date >= weekStart.toISOString().slice(0, 10));
    const weeklyDist = thisWeekActivities.reduce((sum, a) => sum + a.distance, 0);

    // Weekly elevation
    const weeklyElev = thisWeekActivities.reduce((sum, a) => sum + a.elevationGain, 0);

    // CTL (Fitness)
    const dailyTSS = activities.map(a => ({ date: a.date, tss: estimateTSS(a) }));
    const lastTSS = dailyTSS.length > 0 ? dailyTSS[dailyTSS.length - 1].tss : 0;

    return {
      totalDist, compTotalDist,
      totalElev, compTotalElev,
      avgRHR, compAvgRHR,
      avgHRV, compAvgHRV,
      avgSleep, compAvgSleep,
      avgBB,
      latestVO2, compLatestVO2,
      weeklyDist, weeklyElev,
      fitnessCTL: lastTSS,
    };
  }, [activities, compActivities, wellness, compWellness]);

  // Weekly distance chart data
  const weeklyDistData = useMemo(() => aggregateByWeek(activities, 'distance'), [activities]);
  const compWeeklyDistData = useMemo(() => aggregateByWeek(compActivities, 'distance'), [compActivities]);

  // Determine the year to show in heatmap (latest year in date range)
  const heatmapYear = useMemo(() => {
    if (endDate) return parseInt(endDate.slice(0, 4));
    return new Date().getFullYear();
  }, [endDate]);

  // Heatmap data
  const heatmapData = useMemo(() => {
    const map = new Map<string, number>();
    const yearStr = String(heatmapYear);

    if (heatmapMetric === 'load') {
      for (const a of activities) {
        if (a.date.startsWith(yearStr)) {
          map.set(a.date, (map.get(a.date) || 0) + estimateTSS(a));
        }
      }
    } else if (heatmapMetric === 'sleep') {
      for (const w of wellness) {
        if (w.date.startsWith(yearStr) && w.sleepScore) {
          map.set(w.date, w.sleepScore);
        }
      }
    } else {
      for (const w of wellness) {
        if (w.date.startsWith(yearStr) && w.hrv) {
          map.set(w.date, w.hrv);
        }
      }
    }
    return map;
  }, [activities, wellness, heatmapMetric, heatmapYear]);

  // Sparkline data
  const rhrSparkline = useMemo(() => getSparklineData(wellness, 'restingHR'), [wellness]);
  const hrvSparkline = useMemo(() => getSparklineData(wellness, 'hrv'), [wellness]);
  const sleepSparkline = useMemo(() => getSparklineData(wellness, 'sleepScore'), [wellness]);

  const distChart = charts.find(c => c.id === 'weekly-distance-chart');
  const heatmapChart = charts.find(c => c.id === 'year-heatmap');

  const visibleCards = cards.filter(c => customizing || c.visible);

  return (
    <div>
      <TopBar
        title="Dashboard"
        onCustomize={() => setCustomizing(!customizing)}
        isCustomizing={customizing}
      />

      {customizing && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-800">
          Click the eye icon on any card to show/hide it. Click "Done" when finished.
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Stat Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {visibleCards.map((card) => {
            const cardProps = getCardProps(card.id, stats, units, rhrSparkline, hrvSparkline, sleepSparkline);
            if (!cardProps) return null;
            return (
              <StatCard
                key={card.id}
                {...cardProps}
                editMode={customizing}
                visible={card.visible}
                onToggle={() => toggleCard(card.id)}
              />
            );
          })}
        </div>

        {/* Charts */}
        {(customizing || distChart?.visible) && (
          <WeeklyDistanceChart
            data={weeklyDistData}
            comparisonData={compWeeklyDistData}
            comparison={distChart?.comparison || 'YoY'}
            onComparisonChange={(c) => setChartComparison('weekly-distance-chart', c)}
          />
        )}

        {(customizing || heatmapChart?.visible) && (
          <YearHeatmap
            data={heatmapData}
            year={heatmapYear}
            metric={heatmapMetric}
            onMetricChange={setHeatmapMetric}
          />
        )}
      </div>
    </div>
  );
}

function getCardProps(
  id: string,
  stats: any,
  units: 'imperial' | 'metric',
  rhrSparkline: number[],
  hrvSparkline: number[],
  sleepSparkline: number[]
) {
  switch (id) {
    case 'fitness-ctl':
      return { label: 'Fitness (CTL)', value: stats.fitnessCTL.toFixed(0), unit: 'TSS' };
    case 'resting-hr':
      return {
        label: 'Resting HR',
        value: stats.avgRHR.toFixed(0),
        unit: 'bpm',
        delta: stats.avgRHR - stats.compAvgRHR,
        invertDelta: true,
        sparklineData: rhrSparkline,
      };
    case 'vo2max':
      return {
        label: 'VO2 Max',
        value: stats.latestVO2.toFixed(1),
        unit: 'ml/kg/min',
        delta: stats.latestVO2 - stats.compLatestVO2,
      };
    case 'hrv':
      return {
        label: 'HRV',
        value: stats.avgHRV.toFixed(0),
        unit: 'ms',
        delta: stats.avgHRV - stats.compAvgHRV,
        sparklineData: hrvSparkline,
      };
    case 'body-battery':
      return { label: 'Body Battery', value: stats.avgBB.toFixed(0), unit: '%' };
    case 'sleep-score':
      return {
        label: 'Sleep Score',
        value: stats.avgSleep.toFixed(0),
        delta: stats.avgSleep - stats.compAvgSleep,
        sparklineData: sleepSparkline,
      };
    case 'weekly-distance':
      return {
        label: 'Weekly Distance',
        value: formatDistance(stats.weeklyDist, units),
        unit: distanceUnit(units),
      };
    case 'weekly-elevation':
      return {
        label: 'Weekly Elevation',
        value: formatElevation(stats.weeklyElev, units),
        unit: elevationUnit(units),
      };
    case 'streak':
      return { label: 'Streak', value: '—', unit: 'days' };
    case 'weight':
      return { label: 'Weight Trend', value: '—' };
    default:
      return null;
  }
}
