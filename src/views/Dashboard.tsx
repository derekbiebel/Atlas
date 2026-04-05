import { useState, useEffect, useMemo } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { StatCard } from '../components/ui/StatCard';
import { WeeklyDistanceChart } from '../components/charts/WeeklyDistanceChart';
import { YearHeatmap } from '../components/charts/YearHeatmap';
import { useAtlasStore } from '../store/useAtlasStore';
import { usePreferences } from '../store/usePreferences';
import { getActivitiesInRange, getWellnessInRange, getAllSports } from '../db/queries';
import { estimateTSS, getSparklineData } from '../lib/metrics';
import { formatDistance, distanceUnit, formatElevation, elevationUnit, formatDuration } from '../lib/units';
import type { AtlasActivity, WellnessDay } from '../db/schema';
import { Activity, Route, Timer, Flame } from 'lucide-react';
import { db } from '../db/schema';

export function Dashboard() {
  const { startDate, endDate, activeSport } = useAtlasStore();
  const { units, cards, charts, toggleCard } = usePreferences();
  const [customizing, setCustomizing] = useState(false);

  const [activities, setActivities] = useState<AtlasActivity[]>([]);
  const [allActivities, setAllActivities] = useState<AtlasActivity[]>([]);
  const [allSports, setAllSports] = useState<string[]>([]);
  const [wellness, setWellness] = useState<WellnessDay[]>([]);
  const [compWellness, setCompWellness] = useState<WellnessDay[]>([]);
  const [heatmapMetric, setHeatmapMetric] = useState<'load' | 'sleep' | 'hrv'>('load');

  const thisYear = parseInt(endDate.slice(0, 4));

  useEffect(() => {
    getActivitiesInRange(startDate, endDate, activeSport).then(setActivities);

    // Query wellness broadly — use the full date range from activities + padding
    getWellnessInRange(startDate, endDate).then(w => {
      setWellness(w);
      console.log(`[Atlas] Wellness in range: ${w.length} days, RHR data: ${w.filter(d => d.restingHR).length}`);
    });

    // Also try loading ALL wellness to see if data exists
    db.wellness.count().then(c => console.log(`[Atlas] Total wellness rows in DB: ${c}`));

    // All activities for the multi-year chart
    db.activities.toArray().then(setAllActivities);
    getAllSports().then(setAllSports);

    // Last year wellness for stat card comparisons
    const lastYearStart = `${thisYear - 1}-01-01`;
    const lastYearEnd = `${thisYear - 1}-12-31`;
    getWellnessInRange(lastYearStart, lastYearEnd).then(setCompWellness);
  }, [startDate, endDate, activeSport, thisYear]);

  // YoY comparison data for stat cards
  const [compActivities, setCompActivities] = useState<AtlasActivity[]>([]);
  useEffect(() => {
    const lastYearStart = `${thisYear - 1}-01-01`;
    const lastYearEnd = `${thisYear - 1}-12-31`;
    getActivitiesInRange(lastYearStart, lastYearEnd, activeSport).then(setCompActivities);
  }, [thisYear, activeSport]);

  const stats = useMemo(() => {
    const totalDist = activities.reduce((sum, a) => sum + a.distance, 0);
    const totalElev = activities.reduce((sum, a) => sum + a.elevationGain, 0);
    const compTotalDist = compActivities.reduce((sum, a) => sum + a.distance, 0);

    const avg = (arr: WellnessDay[], key: keyof WellnessDay) => {
      const valid = arr.filter(w => w[key]);
      return valid.length > 0 ? valid.reduce((s, w) => s + (w[key] as number || 0), 0) / valid.length : 0;
    };

    const avgRHR = avg(wellness, 'restingHR');
    const compAvgRHR = avg(compWellness, 'restingHR');
    const avgHRV = avg(wellness, 'hrv');
    const compAvgHRV = avg(compWellness, 'hrv');
    const avgSleep = avg(wellness, 'sleepScore');
    const compAvgSleep = avg(compWellness, 'sleepScore');
    const avgBB = avg(wellness, 'bodyBatteryEnd');
    const compAvgBB = avg(compWellness, 'bodyBatteryEnd');

    const vo2Values = wellness.filter(w => w.vo2maxTrend).map(w => w.vo2maxTrend!);
    const latestVO2 = vo2Values.length > 0 ? vo2Values[vo2Values.length - 1] : 0;
    const compVO2Values = compWellness.filter(w => w.vo2maxTrend).map(w => w.vo2maxTrend!);
    const compLatestVO2 = compVO2Values.length > 0 ? compVO2Values[compVO2Values.length - 1] : 0;

    const now = new Date();
    // Weekly stats: use current week if it has data, otherwise use most recent 7 days with data
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    const thisWeekStr = weekStart.toISOString().slice(0, 10);
    let weeklyActivities = activities.filter(a => a.date >= thisWeekStr);
    if (weeklyActivities.length === 0 && activities.length > 0) {
      // Fall back to the last 7 days that had any activity
      const sorted = [...activities].sort((a, b) => b.date.localeCompare(a.date));
      const latestDate = new Date(sorted[0].date);
      const sevenDaysBefore = new Date(latestDate);
      sevenDaysBefore.setDate(latestDate.getDate() - 6);
      const cutoff = sevenDaysBefore.toISOString().slice(0, 10);
      weeklyActivities = activities.filter(a => a.date >= cutoff);
    }
    const weeklyDist = weeklyActivities.reduce((sum, a) => sum + a.distance, 0);
    const weeklyElev = weeklyActivities.reduce((sum, a) => sum + a.elevationGain, 0);

    const dailyTSS = activities.map(a => ({ date: a.date, tss: estimateTSS(a) }));
    const lastTSS = dailyTSS.length > 0 ? dailyTSS[dailyTSS.length - 1].tss : 0;

    return {
      totalDist, totalElev, compTotalDist,
      avgRHR, compAvgRHR,
      avgHRV, compAvgHRV,
      avgSleep, compAvgSleep,
      avgBB, compAvgBB,
      latestVO2, compLatestVO2,
      weeklyDist, weeklyElev,
      fitnessCTL: lastTSS,
    };
  }, [activities, compActivities, wellness, compWellness]);

  const heatmapYear = useMemo(() => {
    if (endDate) return parseInt(endDate.slice(0, 4));
    return new Date().getFullYear();
  }, [endDate]);

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
        if (w.date.startsWith(yearStr) && w.sleepScore) map.set(w.date, w.sleepScore);
      }
    } else {
      for (const w of wellness) {
        if (w.date.startsWith(yearStr) && w.hrv) map.set(w.date, w.hrv);
      }
    }
    return map;
  }, [activities, wellness, heatmapMetric, heatmapYear]);

  const rhrSparkline = useMemo(() => getSparklineData(wellness, 'restingHR'), [wellness]);
  const hrvSparkline = useMemo(() => getSparklineData(wellness, 'hrv'), [wellness]);
  const sleepSparkline = useMemo(() => {
    // Try sleepScore first, fall back to sleepDuration
    const scores = getSparklineData(wellness, 'sleepScore');
    if (scores.some(v => v > 0)) return scores;
    return getSparklineData(wellness, 'sleepDuration');
  }, [wellness]);
  const bbSparkline = useMemo(() => getSparklineData(wellness, 'bodyBatteryEnd'), [wellness]);
  const vo2Sparkline = useMemo(() => getSparklineData(wellness, 'vo2maxTrend'), [wellness]);


  // Activity-based sparklines (last 30 days of daily distance & elevation)
  const distSparkline = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (const a of activities) {
      dayMap.set(a.date, (dayMap.get(a.date) || 0) + a.distance);
    }
    const sorted = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return sorted.slice(-60).map(([, v]) => v);
  }, [activities]);

  const elevSparkline = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (const a of activities) {
      dayMap.set(a.date, (dayMap.get(a.date) || 0) + a.elevationGain);
    }
    const sorted = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return sorted.slice(-60).map(([, v]) => v);
  }, [activities]);

  const ctlSparkline = useMemo(() => {
    const dayMap = new Map<string, number>();
    for (const a of activities) {
      dayMap.set(a.date, (dayMap.get(a.date) || 0) + estimateTSS(a));
    }
    const sorted = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return sorted.slice(-60).map(([, v]) => v);
  }, [activities]);

  const heatmapChart = charts.find(c => c.id === 'year-heatmap');
  const distChart = charts.find(c => c.id === 'weekly-distance-chart');
  const visibleCards = cards.filter(c => customizing || c.visible);

  const totalActivities = activities.length;
  const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0);
  const totalCalories = activities.reduce((sum, a) => sum + (a.calories || 0), 0);

  return (
    <div>
      <TopBar
        title="Dashboard"
        onCustomize={() => setCustomizing(!customizing)}
        isCustomizing={customizing}
      />

      {customizing && (
        <div className="bg-primary/10 border-b border-primary/20 px-6 py-2.5 text-xs text-primary font-medium">
          Toggle cards with the eye icon. Click "Done" when finished.
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Summary bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Activity, label: 'Activities', value: totalActivities.toString(), color: 'text-[var(--atlas-sky)]' },
            { icon: Route, label: 'Total Distance', value: `${formatDistance(stats.totalDist, units)} ${distanceUnit(units)}`, color: 'text-[var(--atlas-teal)]' },
            { icon: Timer, label: 'Total Time', value: formatDuration(totalDuration), color: 'text-[var(--atlas-sage)]' },
            { icon: Flame, label: 'Calories', value: totalCalories.toLocaleString(), color: 'text-[var(--atlas-peach)]' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 bg-card rounded-xl border p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]">
              <div className={`${item.color} bg-current/10 p-2 rounded-lg`}>
                <item.icon className={`size-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">{item.label}</p>
                <p className="font-mono text-lg font-bold tracking-tight">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleCards.map((card) => {
            const sparklines = { rhrSparkline, hrvSparkline, sleepSparkline, bbSparkline, vo2Sparkline, distSparkline, elevSparkline, ctlSparkline };
            const cardProps = getCardProps(card.id, stats, units, sparklines);
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

        {/* YTD Distance Chart */}
        {(customizing || distChart?.visible) && (
          <WeeklyDistanceChart
            activities={allActivities}
            allSports={allSports}
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

function yoyPercent(current: number, previous: number): string | undefined {
  if (!previous || previous === 0 || !current) return undefined;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return `${pct > 0 ? '+' : ''}${pct.toFixed(0)}% YoY`;
}

interface Sparklines {
  rhrSparkline: number[];
  hrvSparkline: number[];
  sleepSparkline: number[];
  bbSparkline: number[];
  vo2Sparkline: number[];
  distSparkline: number[];
  elevSparkline: number[];
  ctlSparkline: number[];
}

function getCardProps(
  id: string,
  stats: any,
  units: 'imperial' | 'metric',
  sp: Sparklines
) {
  switch (id) {
    case 'fitness-ctl':
      return { label: 'Fitness (CTL)', value: stats.fitnessCTL.toFixed(0), unit: 'TSS', sparklineData: sp.ctlSparkline };
    case 'resting-hr':
      return {
        label: 'Resting HR', value: stats.avgRHR.toFixed(0), unit: 'bpm',
        delta: stats.compAvgRHR ? stats.avgRHR - stats.compAvgRHR : undefined,
        deltaLabel: yoyPercent(stats.avgRHR, stats.compAvgRHR),
        invertDelta: true, sparklineData: sp.rhrSparkline,
      };
    case 'vo2max':
      return {
        label: 'VO2 Max', value: stats.latestVO2.toFixed(1), unit: 'ml/kg/min',
        delta: stats.compLatestVO2 ? stats.latestVO2 - stats.compLatestVO2 : undefined,
        deltaLabel: yoyPercent(stats.latestVO2, stats.compLatestVO2),
        sparklineData: sp.vo2Sparkline,
      };
    case 'hrv':
      return {
        label: 'HRV', value: stats.avgHRV.toFixed(0), unit: 'ms',
        delta: stats.compAvgHRV ? stats.avgHRV - stats.compAvgHRV : undefined,
        deltaLabel: yoyPercent(stats.avgHRV, stats.compAvgHRV),
        sparklineData: sp.hrvSparkline,
      };
    case 'body-battery':
      return {
        label: 'Body Battery', value: stats.avgBB.toFixed(0), unit: '%',
        delta: stats.compAvgBB ? stats.avgBB - stats.compAvgBB : undefined,
        deltaLabel: yoyPercent(stats.avgBB, stats.compAvgBB),
        sparklineData: sp.bbSparkline,
      };
    case 'sleep-score':
      return {
        label: 'Sleep', value: stats.avgSleep.toFixed(0),
        unit: stats.avgSleep > 0 ? undefined : undefined,
        delta: stats.compAvgSleep ? stats.avgSleep - stats.compAvgSleep : undefined,
        deltaLabel: yoyPercent(stats.avgSleep, stats.compAvgSleep),
        sparklineData: sp.sleepSparkline,
      };
    case 'weekly-distance':
      return { label: 'Weekly Distance', value: formatDistance(stats.weeklyDist, units), unit: distanceUnit(units), sparklineData: sp.distSparkline };
    case 'weekly-elevation':
      return { label: 'Weekly Elevation', value: formatElevation(stats.weeklyElev, units), unit: elevationUnit(units), sparklineData: sp.elevSparkline };
    case 'streak':
      return { label: 'Streak', value: '—', unit: 'days' };
    case 'weight':
      return { label: 'Weight Trend', value: '—' };
    default:
      return null;
  }
}
