import { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { usePreferences } from '../../store/usePreferences';
import { formatDistance, distanceUnit } from '../../lib/units';
import { cn } from '@/lib/utils';
import { aggregateByWeek } from '../../lib/metrics';
import type { AtlasActivity } from '../../db/schema';
import { ChevronDown } from 'lucide-react';

// Distinct colors for each year line
const yearColors = [
  'var(--atlas-sky)',     // current year — blue
  'var(--atlas-peach)',   // last year — peach
  'var(--atlas-sage)',    // 2 years ago — green
  '#a78bfa',             // purple
  '#f472b6',             // pink
  '#fbbf24',             // amber
  '#34d399',             // emerald
  '#f87171',             // red
];

interface WeeklyDistanceChartProps {
  activities: AtlasActivity[];
  allSports: string[];
}

export function WeeklyDistanceChart({ activities, allSports }: WeeklyDistanceChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 280 });
  const [tooltipState, setTooltipState] = useState<{
    x: number; y: number; week: string; values: { year: number; value: number; color: string }[];
  } | null>(null);
  const [sportFilter, setSportFilter] = useState('all');
  const [sportDropdownOpen, setSportDropdownOpen] = useState(false);
  const units = usePreferences((s) => s.units);

  // Discover all years in the data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const a of activities) {
      years.add(parseInt(a.date.slice(0, 4)));
    }
    return Array.from(years).sort((a, b) => b - a); // newest first
  }, [activities]);

  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set());
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);

  // Default: show all years
  useEffect(() => {
    if (availableYears.length > 0 && selectedYears.size === 0) {
      setSelectedYears(new Set(availableYears));
    }
  }, [availableYears]);

  const toggleYear = (year: number) => {
    setSelectedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) {
        if (next.size > 1) next.delete(year); // keep at least one
      } else {
        next.add(year);
      }
      return next;
    });
  };

  // Build cumulative YTD data per selected year
  const yearDataSets = useMemo(() => {
    const filtered = sportFilter === 'all'
      ? activities
      : activities.filter(a => a.sport === sportFilter);

    const sortedYears = Array.from(selectedYears).sort((a, b) => b - a);

    return sortedYears.map((year, idx) => {
      const yearActivities = filtered.filter(a => a.date.startsWith(String(year)));
      const weekly = aggregateByWeek(yearActivities, 'distance');
      let cumulative = 0;
      const data = weekly.map(d => {
        cumulative += d.value;
        // Map all years onto the same x-axis (use a reference year for alignment)
        const origDate = new Date(d.week);
        const mapped = new Date(2000, origDate.getMonth(), origDate.getDate());
        return { week: mapped.toISOString().slice(0, 10), value: cumulative };
      });
      return {
        year,
        color: yearColors[idx % yearColors.length],
        data,
        total: cumulative,
      };
    });
  }, [activities, selectedYears, sportFilter]);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDimensions({ width, height: 280 });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || yearDataSets.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 12, right: 12, bottom: 28, left: 48 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const g = svg.attr('width', width).attr('height', height)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const convert = (meters: number) =>
      units === 'imperial' ? meters / 1609.344 : meters / 1000;

    const allValues = yearDataSets.flatMap(ds => ds.data.map(d => convert(d.value)));

    const x = d3.scaleTime()
      .domain([new Date(2000, 0, 1), new Date(2000, 11, 31)])
      .range([0, w]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(allValues) || 1])
      .nice()
      .range([h, 0]);

    // Grid
    g.append('g').selectAll('line').data(y.ticks(4)).join('line')
      .attr('x1', 0).attr('x2', w)
      .attr('y1', d => y(d)).attr('y2', d => y(d))
      .attr('stroke', 'currentColor').attr('stroke-opacity', 0.06);

    const line = d3.line<{ week: string; value: number }>()
      .x(d => x(new Date(d.week))).y(d => y(convert(d.value)))
      .curve(d3.curveMonotoneX);

    // Draw each year (oldest first so newest is on top)
    const reversed = [...yearDataSets].reverse();
    for (const ds of reversed) {
      const isCurrent = ds.year === availableYears[0];

      if (isCurrent && ds.data.length > 0) {
        // Gradient fill for current year only
        const gradId = `grad-${ds.year}`;
        const defs = svg.append('defs');
        const grad = defs.append('linearGradient').attr('id', gradId)
          .attr('x1', '0').attr('y1', '0').attr('x2', '0').attr('y2', '1');
        grad.append('stop').attr('offset', '0%').attr('stop-color', ds.color).attr('stop-opacity', 0.15);
        grad.append('stop').attr('offset', '100%').attr('stop-color', ds.color).attr('stop-opacity', 0.02);

        const area = d3.area<{ week: string; value: number }>()
          .x(d => x(new Date(d.week))).y0(h).y1(d => y(convert(d.value)))
          .curve(d3.curveMonotoneX);

        g.append('path').datum(ds.data).attr('fill', `url(#${gradId})`).attr('d', area);
      }

      g.append('path').datum(ds.data)
        .attr('fill', 'none')
        .attr('stroke', ds.color)
        .attr('stroke-width', isCurrent ? 2.5 : 1.5)
        .attr('stroke-dasharray', isCurrent ? 'none' : '6,4')
        .attr('opacity', isCurrent ? 1 : 0.7)
        .attr('d', line);
    }

    // Axes
    g.append('g').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d => d3.timeFormat('%b')(d as Date)))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick text').attr('fill', 'currentColor').attr('opacity', 0.35).style('font-family', 'JetBrains Mono').style('font-size', '10px'))
      .call(g => g.selectAll('.tick line').remove());

    g.append('g')
      .call(d3.axisLeft(y).ticks(4).tickFormat(d => `${d}`))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick text').attr('fill', 'currentColor').attr('opacity', 0.35).style('font-family', 'JetBrains Mono').style('font-size', '10px'))
      .call(g => g.selectAll('.tick line').remove());

    // Hover
    const hoverLine = g.append('line')
      .attr('stroke', 'currentColor').attr('stroke-opacity', 0.1).attr('stroke-dasharray', '3,3')
      .style('display', 'none');

    const bisect = d3.bisector<{ week: string; value: number }, Date>(d => new Date(d.week)).left;

    g.append('rect').attr('width', w).attr('height', h).attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const date = x.invert(mx);
        hoverLine.attr('x1', mx).attr('x2', mx).attr('y1', 0).attr('y2', h).style('display', null);

        const values: { year: number; value: number; color: string }[] = [];
        let closestWeek = '';

        for (const ds of yearDataSets) {
          if (ds.data.length === 0) continue;
          const idx = Math.min(bisect(ds.data, date, 1), ds.data.length - 1);
          const d0 = ds.data[Math.max(0, idx - 1)];
          const d1 = ds.data[idx];
          const d = !d1 ? d0 : !d0 ? d1 :
            Math.abs(date.getTime() - new Date(d0.week).getTime()) < Math.abs(date.getTime() - new Date(d1.week).getTime()) ? d0 : d1;
          if (d) {
            values.push({ year: ds.year, value: d.value, color: ds.color });
            if (!closestWeek) closestWeek = d.week;
          }
        }

        setTooltipState({ x: mx + margin.left, y: margin.top + 10, week: closestWeek, values });
      })
      .on('mouseleave', () => {
        hoverLine.style('display', 'none');
        setTooltipState(null);
      });

  }, [yearDataSets, dimensions, units, availableYears]);

  return (
    <div className="bg-card rounded-xl border p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold">YTD Distance</h3>
          {/* Year legend */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            {yearDataSets.map(ds => (
              <span key={ds.year} className="font-mono text-[11px] text-muted-foreground">
                <span className="inline-block w-3 h-0.5 rounded-full mr-1 align-middle" style={{ backgroundColor: ds.color }} />
                {ds.year}: <span className="font-semibold text-foreground">{formatDistance(ds.total, units)} {distanceUnit(units)}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sport filter */}
          <div className="relative">
            <button
              onClick={() => { setSportDropdownOpen(!sportDropdownOpen); setYearDropdownOpen(false); }}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-medium rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
            >
              {sportFilter === 'all' ? 'All Sports' : sportFilter}
              <ChevronDown className="size-3" />
            </button>
            {sportDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSportDropdownOpen(false)} />
                <div className="absolute right-0 top-8 z-50 bg-card border rounded-lg shadow-lg py-1 min-w-[140px] max-h-60 overflow-y-auto">
                  <button
                    onClick={() => { setSportFilter('all'); setSportDropdownOpen(false); }}
                    className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors', sportFilter === 'all' && 'font-semibold text-primary')}
                  >
                    All Sports
                  </button>
                  {allSports.map(s => (
                    <button
                      key={s}
                      onClick={() => { setSportFilter(s); setSportDropdownOpen(false); }}
                      className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors', sportFilter === s && 'font-semibold text-primary')}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Year selector */}
          <div className="relative">
            <button
              onClick={() => { setYearDropdownOpen(!yearDropdownOpen); setSportDropdownOpen(false); }}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-medium rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
            >
              {selectedYears.size === availableYears.length ? 'All Years' : `${selectedYears.size} Years`}
              <ChevronDown className="size-3" />
            </button>
            {yearDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setYearDropdownOpen(false)} />
                <div className="absolute right-0 top-8 z-50 bg-card border rounded-lg shadow-lg py-1 min-w-[120px]">
                  {availableYears.map((y, i) => (
                    <button
                      key={y}
                      onClick={() => toggleYear(y)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <span className={cn('w-3 h-3 rounded border flex items-center justify-center text-[8px]',
                        selectedYears.has(y) ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                      )}>
                        {selectedYears.has(y) && '✓'}
                      </span>
                      <span className="inline-block w-2 h-0.5 rounded-full" style={{ backgroundColor: yearColors[i % yearColors.length] }} />
                      {y}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div ref={containerRef} className="relative">
        <svg ref={svgRef} />
        {tooltipState && tooltipState.values.length > 0 && (
          <div
            className="absolute bg-foreground text-background rounded-lg px-3 py-2 text-xs pointer-events-none shadow-xl z-10"
            style={{ left: tooltipState.x, top: tooltipState.y, transform: 'translateX(-50%)' }}
          >
            <div className="opacity-60 text-[10px] mb-1">
              {new Date(tooltipState.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            {tooltipState.values.map(v => (
              <div key={v.year} className="flex items-center gap-1.5">
                <span className="w-2 h-0.5 rounded-full inline-block" style={{ backgroundColor: v.color }} />
                <span className="font-mono">
                  {v.year}: <span className="font-bold">{formatDistance(v.value, units)} {distanceUnit(units)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
