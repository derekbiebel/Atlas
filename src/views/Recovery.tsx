import { useState, useEffect, useMemo } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAtlasStore } from '../store/useAtlasStore';
import { getWellnessInRange } from '../db/queries';
import type { WellnessDay } from '../db/schema';
import { Moon, Heart, Battery, Activity, Info, Scale } from 'lucide-react';
import { Sparkline } from '../components/charts/Sparkline';
import { usePreferences } from '../store/usePreferences';
import { formatWeight, weightUnit } from '../lib/units';

export function Recovery() {
  const { startDate, endDate } = useAtlasStore();
  const units = usePreferences((s) => s.units);
  const [wellness, setWellness] = useState<WellnessDay[]>([]);

  useEffect(() => {
    getWellnessInRange(startDate, endDate).then(setWellness);
  }, [startDate, endDate]);

  const hasData = wellness.length > 0;

  const sleepData = useMemo(() => wellness.filter(w => w.sleepScore).map(w => w.sleepScore!), [wellness]);
  const hrvData = useMemo(() => wellness.filter(w => w.hrv).map(w => w.hrv!), [wellness]);
  const rhrData = useMemo(() => wellness.filter(w => w.restingHR).map(w => w.restingHR!), [wellness]);
  const bbData = useMemo(() => wellness.filter(w => w.bodyBatteryEnd).map(w => w.bodyBatteryEnd!), [wellness]);
  const weightData = useMemo(() => wellness.filter(w => w.bodyWeight).map(w => w.bodyWeight!), [wellness]);

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const sections = [
    {
      icon: Moon,
      title: 'Sleep',
      color: 'text-[var(--atlas-peach)]',
      bgColor: 'bg-[var(--atlas-peach)]/10',
      value: sleepData.length > 0 ? avg(sleepData).toFixed(0) : null,
      unit: 'score',
      sparkline: sleepData.slice(-30),
      sparkColor: 'var(--atlas-peach)',
      details: sleepData.length > 0 ? [
        { label: 'Best', value: Math.max(...sleepData).toFixed(0) },
        { label: 'Worst', value: Math.min(...sleepData).toFixed(0) },
        { label: 'Days tracked', value: sleepData.length.toString() },
      ] : null,
    },
    {
      icon: Activity,
      title: 'HRV',
      color: 'text-[var(--atlas-sage)]',
      bgColor: 'bg-[var(--atlas-sage)]/10',
      value: hrvData.length > 0 ? avg(hrvData).toFixed(0) : null,
      unit: 'ms',
      sparkline: hrvData.slice(-30),
      sparkColor: 'var(--atlas-sage)',
      details: hrvData.length > 0 ? [
        { label: 'Best', value: Math.max(...hrvData).toFixed(0) + ' ms' },
        { label: 'Lowest', value: Math.min(...hrvData).toFixed(0) + ' ms' },
        { label: 'Days tracked', value: hrvData.length.toString() },
      ] : null,
    },
    {
      icon: Battery,
      title: 'Body Battery',
      color: 'text-[var(--atlas-sky)]',
      bgColor: 'bg-[var(--atlas-sky)]/10',
      value: bbData.length > 0 ? avg(bbData).toFixed(0) : null,
      unit: '%',
      sparkline: bbData.slice(-30),
      sparkColor: 'var(--atlas-sky)',
      details: bbData.length > 0 ? [
        { label: 'Best', value: Math.max(...bbData).toFixed(0) + '%' },
        { label: 'Lowest', value: Math.min(...bbData).toFixed(0) + '%' },
        { label: 'Days tracked', value: bbData.length.toString() },
      ] : null,
    },
    {
      icon: Heart,
      title: 'Resting HR',
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      value: rhrData.length > 0 ? avg(rhrData).toFixed(0) : null,
      unit: 'bpm',
      sparkline: rhrData.slice(-30),
      sparkColor: '#f43f5e',
      details: rhrData.length > 0 ? [
        { label: 'Best', value: Math.min(...rhrData).toFixed(0) + ' bpm' },
        { label: 'Highest', value: Math.max(...rhrData).toFixed(0) + ' bpm' },
        { label: 'Days tracked', value: rhrData.length.toString() },
      ] : null,
    },
    {
      icon: Scale,
      title: 'Weight',
      color: 'text-[var(--atlas-teal)]',
      bgColor: 'bg-[var(--atlas-teal)]/10',
      value: weightData.length > 0 ? formatWeight(weightData[weightData.length - 1], units) : null,
      unit: weightUnit(units),
      sparkline: weightData.slice(-30),
      sparkColor: 'var(--atlas-teal)',
      details: weightData.length > 0 ? [
        { label: 'High', value: formatWeight(Math.max(...weightData), units) + ' ' + weightUnit(units) },
        { label: 'Low', value: formatWeight(Math.min(...weightData), units) + ' ' + weightUnit(units) },
        { label: 'Days tracked', value: weightData.length.toString() },
      ] : null,
    },
  ];

  return (
    <div>
      <TopBar title="Recovery & Wellness" />

      <div className="p-6 space-y-6">
        {/* Info banner if no data */}
        {!hasData && (
          <div className="flex items-start gap-3 bg-card border rounded-xl p-5">
            <Info className="size-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">No wellness data available</p>
              <p className="text-xs text-muted-foreground mt-1">
                Import your full Garmin export (.zip with FIT files) to see sleep, HRV, body battery, and resting heart rate data.
                Go to Garmin Connect → Profile → Account Settings → Data Management → Export Your Data.
              </p>
            </div>
          </div>
        )}

        {/* Wellness cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`${section.bgColor} p-2 rounded-lg`}>
                      <section.icon className={`size-4 ${section.color}`} />
                    </div>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </div>
                  {section.sparkline.length > 0 && (
                    <div className="w-24 h-8">
                      <Sparkline data={section.sparkline} color={section.sparkColor} />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {section.value !== null ? (
                  <div>
                    <p className="font-mono text-3xl font-bold tracking-tight">
                      {section.value}
                      <span className="ml-1.5 text-sm font-medium text-muted-foreground">{section.unit}</span>
                    </p>
                    {section.details && (
                      <div className="flex gap-4 mt-3 pt-3 border-t">
                        {section.details.map((d) => (
                          <div key={d.label}>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.label}</p>
                            <p className="font-mono text-sm font-semibold mt-0.5">{d.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">
                    No data — import Garmin FIT files to populate
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
