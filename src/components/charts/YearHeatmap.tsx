import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

interface YearHeatmapProps {
  data: Map<string, number>; // date string -> value
  year: number;
  metric: 'load' | 'sleep' | 'hrv';
  onMetricChange: (m: 'load' | 'sleep' | 'hrv') => void;
  onDayClick?: (date: string) => void;
}

const colorScales = {
  load: ['#e0f5fb', '#b4e5f5', '#8cd5ee', '#4aa8cc', '#1a7a9a'],
  sleep: ['#fdf0e8', '#f8d0b0', '#eca683', '#d07840', '#a05010'],
  hrv: ['#edf3eb', '#c8ddc4', '#95b088', '#688a5c', '#3a6030'],
};

const dayLabels = ['', 'M', '', 'W', '', 'F', ''];
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function YearHeatmap({ data, year, metric, onMetricChange, onDayClick }: YearHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; value: number } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const cellSize = 12;
    const cellGap = 2;
    const cellTotal = cellSize + cellGap;
    const marginTop = 20;
    const marginLeft = 28;

    // Build all dates for the year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const today = new Date();

    const days: { date: Date; dateStr: string; week: number; day: number }[] = [];
    const d = new Date(startDate);

    // Align to start of week (Monday)
    const startDay = (startDate.getDay() + 6) % 7; // Monday = 0

    while (d <= endDate) {
      const dayOfYear = Math.floor((d.getTime() - startDate.getTime()) / 86400000);
      const adjustedDay = dayOfYear + startDay;
      const week = Math.floor(adjustedDay / 7);
      const day = adjustedDay % 7;
      const dateStr = d.toISOString().slice(0, 10);
      days.push({ date: new Date(d), dateStr, week, day });
      d.setDate(d.getDate() + 1);
    }

    const maxWeek = Math.max(...days.map((d) => d.week));
    const width = marginLeft + (maxWeek + 1) * cellTotal + 10;
    const height = marginTop + 7 * cellTotal + 10;

    svg.attr('width', width).attr('height', height);

    const values = Array.from(data.values()).filter((v) => v > 0);
    const maxVal = d3.max(values) || 1;
    const scale = d3.scaleQuantize<string>()
      .domain([0, maxVal])
      .range(colorScales[metric]);

    const g = svg.append('g').attr('transform', `translate(${marginLeft},${marginTop})`);

    // Day labels
    svg.selectAll('.day-label')
      .data(dayLabels)
      .join('text')
      .attr('x', marginLeft - 6)
      .attr('y', (_, i) => marginTop + i * cellTotal + cellSize - 1)
      .attr('text-anchor', 'end')
      .attr('fill', 'var(--text3)')
      .style('font-family', 'JetBrains Mono')
      .style('font-size', '9px')
      .text((d) => d);

    // Month labels
    const monthStarts = days.filter((d) => d.date.getDate() === 1);
    g.selectAll('.month-label')
      .data(monthStarts)
      .join('text')
      .attr('x', (d) => d.week * cellTotal)
      .attr('y', -6)
      .attr('fill', 'var(--text3)')
      .style('font-family', 'JetBrains Mono')
      .style('font-size', '9px')
      .text((d) => monthNames[d.date.getMonth()]);

    // Cells
    g.selectAll('.cell')
      .data(days)
      .join('rect')
      .attr('class', 'cell')
      .attr('x', (d) => d.week * cellTotal)
      .attr('y', (d) => d.day * cellTotal)
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('rx', 2)
      .attr('fill', (d) => {
        if (d.date > today) return 'var(--bg)';
        const val = data.get(d.dateStr);
        if (!val || val === 0) return 'var(--surface2)';
        return scale(val);
      })
      .style('cursor', (d) => data.has(d.dateStr) ? 'pointer' : 'default')
      .on('mouseenter', function (_event, d) {
        const val = data.get(d.dateStr);
        if (val !== undefined) {
          setTooltip({
            x: d.week * cellTotal + marginLeft + cellSize / 2,
            y: d.day * cellTotal + marginTop - 8,
            date: d.dateStr,
            value: val,
          });
        }
      })
      .on('mouseleave', () => setTooltip(null))
      .on('click', (_, d) => {
        if (onDayClick && data.has(d.dateStr)) {
          onDayClick(d.dateStr);
        }
      });

  }, [data, year, metric, onDayClick]);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text2)]">Year View — {year}</h3>
        <div className="flex gap-1">
          {(['load', 'sleep', 'hrv'] as const).map((m) => (
            <button
              key={m}
              onClick={() => onMetricChange(m)}
              className={`px-2 py-0.5 text-xs font-mono rounded capitalize transition-colors ${
                metric === m
                  ? 'bg-[var(--primary-light)] text-[var(--primary-text)]'
                  : 'text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              {m === 'hrv' ? 'HRV' : m}
            </button>
          ))}
        </div>
      </div>
      <div className="relative overflow-x-auto">
        <svg ref={svgRef} />
        {tooltip && (
          <div
            className="absolute bg-[var(--surface)] border border-[var(--border2)] rounded-lg px-3 py-2 text-xs pointer-events-none shadow-lg"
            style={{ left: tooltip.x, top: tooltip.y - 40, transform: 'translateX(-50%)' }}
          >
            <div className="font-mono font-semibold">{tooltip.value.toFixed(0)}</div>
            <div className="text-[var(--text3)]">{tooltip.date}</div>
          </div>
        )}
      </div>
      {/* Color scale legend */}
      <div className="flex items-center gap-1 mt-3">
        <span className="text-[10px] text-[var(--text3)] font-mono mr-1">Less</span>
        {colorScales[metric].map((color, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
        ))}
        <span className="text-[10px] text-[var(--text3)] font-mono ml-1">More</span>
      </div>
    </div>
  );
}
