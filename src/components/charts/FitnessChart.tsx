import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import type { AtlasActivity } from '@/db/schema';
import { estimateTSS, calculateCTL, calculateATL } from '@/lib/metrics';

interface FitnessChartProps {
  activities: AtlasActivity[];
  startDate: string;
  endDate: string;
}

interface DayData {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

export function FitnessChart({ activities, startDate, endDate }: FitnessChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 });
  const [tooltipState, setTooltipState] = useState<{
    x: number;
    y: number;
    data: DayData;
  } | null>(null);

  // ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDimensions({ width, height: 300 });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Build daily TSS and compute CTL/ATL/TSB
  const chartData: DayData[] = (() => {
    // Build daily TSS map
    const tssMap = new Map<string, number>();
    for (const a of activities) {
      const tss = estimateTSS(a);
      tssMap.set(a.date, (tssMap.get(a.date) || 0) + tss);
    }

    // Fill every day in range
    const dailyTSS: { date: string; tss: number }[] = [];
    const d = new Date(startDate);
    const end = new Date(endDate);
    while (d <= end) {
      const dateStr = d.toISOString().slice(0, 10);
      dailyTSS.push({ date: dateStr, tss: tssMap.get(dateStr) || 0 });
      d.setDate(d.getDate() + 1);
    }

    if (dailyTSS.length === 0) return [];

    const ctlData = calculateCTL(dailyTSS);
    const atlData = calculateATL(dailyTSS);

    return dailyTSS.map((day, i) => ({
      date: day.date,
      ctl: ctlData[i]?.ctl ?? 0,
      atl: atlData[i]?.atl ?? 0,
      tsb: (ctlData[i]?.ctl ?? 0) - (atlData[i]?.atl ?? 0),
    }));
  })();

  // D3 render
  useEffect(() => {
    if (!svgRef.current || chartData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 16, right: 16, bottom: 28, left: 48 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleTime()
      .domain([new Date(chartData[0].date), new Date(chartData[chartData.length - 1].date)])
      .range([0, w]);

    const allVals = chartData.flatMap((d) => [d.ctl, d.atl, d.tsb]);
    const y = d3
      .scaleLinear()
      .domain([d3.min(allVals) ?? -20, d3.max(allVals) ?? 60])
      .nice()
      .range([h, 0]);

    // Grid
    g.append('g')
      .selectAll('line')
      .data(y.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', w)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.06);

    // Zero line
    g.append('line')
      .attr('x1', 0)
      .attr('x2', w)
      .attr('y1', y(0))
      .attr('y2', y(0))
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.15)
      .attr('stroke-dasharray', '4,4');

    // TSB area (green above 0, red below 0)
    const tsbAreaPositive = d3
      .area<DayData>()
      .x((d) => x(new Date(d.date)))
      .y0(y(0))
      .y1((d) => y(Math.max(0, d.tsb)))
      .curve(d3.curveMonotoneX);

    const tsbAreaNegative = d3
      .area<DayData>()
      .x((d) => x(new Date(d.date)))
      .y0(y(0))
      .y1((d) => y(Math.min(0, d.tsb)))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(chartData)
      .attr('fill', 'var(--atlas-sage)')
      .attr('fill-opacity', 0.15)
      .attr('d', tsbAreaPositive);

    g.append('path')
      .datum(chartData)
      .attr('fill', 'var(--atlas-peach)')
      .attr('fill-opacity', 0.15)
      .attr('d', tsbAreaNegative);

    // CTL line (blue)
    const ctlLine = d3
      .line<DayData>()
      .x((d) => x(new Date(d.date)))
      .y((d) => y(d.ctl))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', 'var(--atlas-sky)')
      .attr('stroke-width', 2.5)
      .attr('d', ctlLine);

    // ATL line (peach)
    const atlLine = d3
      .line<DayData>()
      .x((d) => x(new Date(d.date)))
      .y((d) => y(d.atl))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', 'var(--atlas-peach)')
      .attr('stroke-width', 2.5)
      .attr('d', atlLine);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(d3.timeMonth.every(1))
          .tickFormat((d) => d3.timeFormat('%b')(d as Date))
      )
      .call((g) => g.select('.domain').remove())
      .call((g) =>
        g
          .selectAll('.tick text')
          .attr('fill', 'currentColor')
          .attr('opacity', 0.35)
          .style('font-family', 'JetBrains Mono')
          .style('font-size', '10px')
      )
      .call((g) => g.selectAll('.tick line').remove());

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .call((g) => g.select('.domain').remove())
      .call((g) =>
        g
          .selectAll('.tick text')
          .attr('fill', 'currentColor')
          .attr('opacity', 0.35)
          .style('font-family', 'JetBrains Mono')
          .style('font-size', '10px')
      )
      .call((g) => g.selectAll('.tick line').remove());

    // Hover
    const hoverLine = g
      .append('line')
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.1)
      .attr('stroke-dasharray', '3,3')
      .style('display', 'none');

    const hoverDotCtl = g
      .append('circle')
      .attr('r', 4)
      .attr('fill', 'var(--atlas-sky)')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('display', 'none');

    const hoverDotAtl = g
      .append('circle')
      .attr('r', 4)
      .attr('fill', 'var(--atlas-peach)')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('display', 'none');

    const bisect = d3.bisector<DayData, Date>((d) => new Date(d.date)).left;

    g.append('rect')
      .attr('width', w)
      .attr('height', h)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const date = x.invert(mx);
        const idx = Math.min(bisect(chartData, date, 1), chartData.length - 1);
        const d0 = chartData[idx - 1];
        const d1 = chartData[idx];
        if (!d0 && !d1) return;
        const dd =
          !d1
            ? d0
            : !d0
              ? d1
              : date.getTime() - new Date(d0.date).getTime() >
                  new Date(d1.date).getTime() - date.getTime()
                ? d1
                : d0;

        const cx = x(new Date(dd.date));

        hoverLine
          .attr('x1', cx)
          .attr('x2', cx)
          .attr('y1', 0)
          .attr('y2', h)
          .style('display', null);
        hoverDotCtl.attr('cx', cx).attr('cy', y(dd.ctl)).style('display', null);
        hoverDotAtl.attr('cx', cx).attr('cy', y(dd.atl)).style('display', null);

        setTooltipState({
          x: cx + margin.left,
          y: Math.min(y(dd.ctl), y(dd.atl)) + margin.top,
          data: dd,
        });
      })
      .on('mouseleave', () => {
        hoverLine.style('display', 'none');
        hoverDotCtl.style('display', 'none');
        hoverDotAtl.style('display', 'none');
        setTooltipState(null);
      });
  }, [chartData, dimensions]);

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 text-xs font-mono text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded-full bg-[var(--atlas-sky)] inline-block" />
          Fitness (CTL)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded-full bg-[var(--atlas-peach)] inline-block" />
          Fatigue (ATL)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 rounded-sm bg-[var(--atlas-sage)] opacity-40 inline-block" />
          Form (TSB)
        </span>
      </div>

      <div ref={containerRef} className="relative">
        <svg ref={svgRef} />
        {tooltipState && (
          <div
            className="absolute bg-foreground text-background rounded-lg px-3 py-2 text-xs pointer-events-none shadow-xl z-10"
            style={{
              left: tooltipState.x,
              top: Math.max(8, tooltipState.y - 80),
              transform: 'translateX(-50%)',
            }}
          >
            <div className="opacity-60 text-[10px] mb-1">
              {new Date(tooltipState.data.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-0.5 bg-[var(--atlas-sky)] rounded-full inline-block" />
              <span>
                CTL{' '}
                <span className="font-mono font-bold">{tooltipState.data.ctl.toFixed(1)}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-0.5 bg-[var(--atlas-peach)] rounded-full inline-block" />
              <span>
                ATL{' '}
                <span className="font-mono font-bold">{tooltipState.data.atl.toFixed(1)}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 pt-0.5 border-t border-white/20">
              <span className="w-2 h-1 bg-[var(--atlas-sage)] rounded-sm inline-block opacity-60" />
              <span>
                TSB{' '}
                <span className="font-mono font-bold">{tooltipState.data.tsb.toFixed(1)}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
