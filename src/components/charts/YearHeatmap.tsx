import { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { cn } from '@/lib/utils';

interface YearHeatmapProps {
  data: Map<string, number>;
  year: number;
  metric: 'load' | 'sleep' | 'hrv';
  onMetricChange: (m: 'load' | 'sleep' | 'hrv') => void;
  onDayClick?: (date: string) => void;
}

const colorScales = {
  load: ['#dbeef6', '#a3d5ec', '#6bbde2', '#3a9ec9', '#1a7a9a'],
  sleep: ['#fdf0e8', '#f8d0b0', '#eca683', '#d07840', '#a05010'],
  hrv: ['#edf3eb', '#c8ddc4', '#95b088', '#688a5c', '#3a6030'],
};

const dayLabels = ['', 'M', '', 'W', '', 'F', ''];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function YearHeatmap({ data, year, metric, onMetricChange, onDayClick }: YearHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; value: number } | null>(null);

  // Determine which months have data
  const monthRange = useMemo(() => {
    if (data.size === 0) return { startMonth: 0, endMonth: 11 };

    let minMonth = 11;
    let maxMonth = 0;
    for (const dateStr of data.keys()) {
      if (dateStr.startsWith(String(year))) {
        const month = parseInt(dateStr.slice(5, 7)) - 1;
        if (month < minMonth) minMonth = month;
        if (month > maxMonth) maxMonth = month;
      }
    }
    // Pad one month on each side for breathing room (clamped to 0-11)
    return {
      startMonth: Math.max(0, minMonth - 1),
      endMonth: Math.min(11, maxMonth + 1),
    };
  }, [data, year]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const containerWidth = containerRef.current.clientWidth;

    const { startMonth, endMonth } = monthRange;
    const startDate = new Date(year, startMonth, 1);
    const endDate = new Date(year, endMonth + 1, 0); // last day of endMonth
    const today = new Date();

    // Build days array
    const days: { date: Date; dateStr: string; week: number; day: number }[] = [];
    const d = new Date(startDate);
    const startDay = (startDate.getDay() + 6) % 7; // Monday = 0

    while (d <= endDate) {
      const daysSinceStart = Math.floor((d.getTime() - startDate.getTime()) / 86400000);
      const adjustedDay = daysSinceStart + startDay;
      const week = Math.floor(adjustedDay / 7);
      const day = adjustedDay % 7;
      const dateStr = d.toISOString().slice(0, 10);
      days.push({ date: new Date(d), dateStr, week, day });
      d.setDate(d.getDate() + 1);
    }

    if (days.length === 0) return;

    const maxWeek = Math.max(...days.map(d => d.week));
    const totalWeeks = maxWeek + 1;

    // Calculate cell size to fill available width
    const marginLeft = 28;
    const marginRight = 10;
    const marginTop = 26;
    const availableWidth = containerWidth - marginLeft - marginRight;
    const cellGap = 3;
    const cellSize = Math.max(14, Math.min(22, Math.floor((availableWidth - (totalWeeks - 1) * cellGap) / totalWeeks)));
    const cellTotal = cellSize + cellGap;

    const width = marginLeft + totalWeeks * cellTotal + marginRight;
    const height = marginTop + 7 * cellTotal + 10;

    svg.attr('width', width).attr('height', height);

    const values = Array.from(data.values()).filter(v => v > 0);
    const maxVal = d3.max(values) || 1;
    const scale = d3.scaleQuantize<string>().domain([0, maxVal]).range(colorScales[metric]);

    const g = svg.append('g').attr('transform', `translate(${marginLeft},${marginTop})`);

    // Day labels
    svg.selectAll('.day-label').data(dayLabels).join('text')
      .attr('x', marginLeft - 6)
      .attr('y', (_, i) => marginTop + i * cellTotal + cellSize - 2)
      .attr('text-anchor', 'end')
      .attr('fill', 'currentColor').attr('opacity', 0.3)
      .style('font-family', 'JetBrains Mono').style('font-size', '10px')
      .text(d => d);

    // Month labels
    const monthStarts = days.filter(d => d.date.getDate() === 1);
    g.selectAll('.month-label').data(monthStarts).join('text')
      .attr('x', d => d.week * cellTotal)
      .attr('y', -10)
      .attr('fill', 'currentColor').attr('opacity', 0.4)
      .style('font-family', 'JetBrains Mono').style('font-size', '11px').style('font-weight', '500')
      .text(d => monthNames[d.date.getMonth()]);

    // Cells
    g.selectAll('.cell').data(days).join('rect')
      .attr('x', d => d.week * cellTotal)
      .attr('y', d => d.day * cellTotal)
      .attr('width', cellSize).attr('height', cellSize)
      .attr('rx', 3)
      .attr('fill', d => {
        if (d.date > today) return 'transparent';
        const val = data.get(d.dateStr);
        if (!val || val === 0) return 'var(--muted)';
        return scale(val);
      })
      .style('cursor', d => data.has(d.dateStr) ? 'pointer' : 'default')
      .on('mouseenter', function (_event, d) {
        const val = data.get(d.dateStr);
        if (val !== undefined) {
          setTooltip({
            x: d.week * cellTotal + marginLeft + cellSize / 2,
            y: d.day * cellTotal + marginTop - 8,
            date: d.dateStr,
            value: val,
          });
          d3.select(this).attr('stroke', 'var(--foreground)').attr('stroke-width', 1.5).attr('stroke-opacity', 0.3);
        }
      })
      .on('mouseleave', function () {
        setTooltip(null);
        d3.select(this).attr('stroke', 'none');
      })
      .on('click', (_, d) => {
        if (onDayClick && data.has(d.dateStr)) onDayClick(d.dateStr);
      });

  }, [data, year, metric, onDayClick, monthRange]);

  // Title shows the month range
  const titleRange = monthRange.startMonth === 0 && monthRange.endMonth === 11
    ? `${year}`
    : `${monthNames[monthRange.startMonth]} – ${monthNames[monthRange.endMonth]} ${year}`;

  return (
    <div className="bg-card rounded-xl border p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Year View — {titleRange}</h3>
        <div className="flex bg-muted rounded-lg p-0.5">
          {(['load', 'sleep', 'hrv'] as const).map((m) => (
            <button
              key={m}
              onClick={() => onMetricChange(m)}
              className={cn(
                'px-2.5 py-1 text-[11px] font-mono font-medium rounded-md transition-all capitalize',
                metric === m
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {m === 'hrv' ? 'HRV' : m}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="relative">
        <svg ref={svgRef} />
        {tooltip && (
          <div
            className="absolute bg-foreground text-background rounded-lg px-3 py-1.5 text-xs pointer-events-none shadow-xl z-10"
            style={{ left: tooltip.x, top: tooltip.y - 44, transform: 'translateX(-50%)' }}
          >
            <div className="font-mono font-bold">{tooltip.value.toFixed(0)}</div>
            <div className="opacity-70 text-[10px]">{tooltip.date}</div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 mt-4">
        <span className="text-[10px] text-muted-foreground font-mono">Less</span>
        {colorScales[metric].map((color, i) => (
          <div key={i} className="w-3.5 h-3.5 rounded" style={{ backgroundColor: color }} />
        ))}
        <span className="text-[10px] text-muted-foreground font-mono">More</span>
      </div>
    </div>
  );
}
