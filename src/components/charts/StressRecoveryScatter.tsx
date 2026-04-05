import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import type { AtlasActivity } from '@/db/schema';
import { estimateTSS } from '@/lib/metrics';

interface StressRecoveryScatterProps {
  activities: AtlasActivity[];
}

interface ScatterPoint {
  date: string;
  sport: string;
  tss: number;
  avgHR: number;
}

const SPORT_COLORS: Record<string, string> = {
  running: 'var(--atlas-sky)',
  cycling: 'var(--atlas-sage)',
  swimming: '#60a5fa',
  walking: '#a78bfa',
  hiking: '#f59e0b',
  strength_training: 'var(--atlas-peach)',
  other: '#94a3b8',
};

function getSportColor(sport: string): string {
  const key = sport.toLowerCase().replace(/\s+/g, '_');
  return SPORT_COLORS[key] || SPORT_COLORS.other;
}

export function StressRecoveryScatter({ activities }: StressRecoveryScatterProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [tooltipState, setTooltipState] = useState<{
    x: number;
    y: number;
    point: ScatterPoint;
  } | null>(null);

  // ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDimensions({ width, height: 400 });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Build scatter data
  const points: ScatterPoint[] = activities
    .filter((a) => a.avgHR && a.duration)
    .map((a) => ({
      date: a.date,
      sport: a.sport,
      tss: estimateTSS(a),
      avgHR: a.avgHR!,
    }))
    .filter((p) => p.tss > 0);

  // Unique sports for legend
  const sports = Array.from(new Set(points.map((p) => p.sport))).sort();

  // D3 render
  useEffect(() => {
    if (!svgRef.current || points.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 24, right: 16, bottom: 36, left: 48 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const tssExtent = d3.extent(points, (d) => d.tss) as [number, number];
    const hrExtent = d3.extent(points, (d) => d.avgHR) as [number, number];

    const x = d3.scaleLinear().domain([0, tssExtent[1] * 1.1]).nice().range([0, w]);
    const y = d3.scaleLinear().domain([hrExtent[0] * 0.95, hrExtent[1] * 1.05]).nice().range([h, 0]);

    // Midpoints for quadrant lines
    const xMid = (x.domain()[0] + x.domain()[1]) / 2;
    const yMid = (y.domain()[0] + y.domain()[1]) / 2;

    // Quadrant background fills
    const quadrants = [
      { x1: 0, y1: 0, x2: x(xMid), y2: y(yMid), label: 'Low Load\nLow Stress', labelX: x(xMid) * 0.5, labelY: (h + y(yMid)) / 2, fill: 'var(--atlas-sage)', desc: 'Recovery' },
      { x1: x(xMid), y1: 0, x2: w, y2: y(yMid), label: 'High Load\nLow Stress', labelX: (x(xMid) + w) / 2, labelY: (h + y(yMid)) / 2, fill: 'var(--atlas-sky)', desc: 'Optimal' },
      { x1: 0, y1: y(yMid), x2: x(xMid), y2: h, label: 'Low Load\nHigh Stress', labelX: x(xMid) * 0.5, labelY: y(yMid) / 2, fill: 'var(--atlas-peach)', desc: 'Overreaching' },
      { x1: x(xMid), y1: y(yMid), x2: w, y2: h, label: 'High Load\nHigh Stress', labelX: (x(xMid) + w) / 2, labelY: y(yMid) / 2, fill: 'currentColor', desc: '' },
    ];

    // Note: y-axis is inverted (high HR = top of chart = low y value)
    // Quadrant fills
    for (const q of quadrants) {
      g.append('rect')
        .attr('x', q.x1)
        .attr('y', q.y1)
        .attr('width', q.x2 - q.x1)
        .attr('height', q.y2 - q.y1)
        .attr('fill', q.fill)
        .attr('fill-opacity', 0.04);
    }

    // Quadrant divider lines
    g.append('line')
      .attr('x1', x(xMid)).attr('x2', x(xMid))
      .attr('y1', 0).attr('y2', h)
      .attr('stroke', 'currentColor').attr('stroke-opacity', 0.1)
      .attr('stroke-dasharray', '4,4');

    g.append('line')
      .attr('x1', 0).attr('x2', w)
      .attr('y1', y(yMid)).attr('y2', y(yMid))
      .attr('stroke', 'currentColor').attr('stroke-opacity', 0.1)
      .attr('stroke-dasharray', '4,4');

    // Quadrant labels
    for (const q of quadrants) {
      const lines = q.label.split('\n');
      const textGroup = g.append('text')
        .attr('x', q.labelX)
        .attr('y', q.labelY)
        .attr('text-anchor', 'middle')
        .attr('fill', 'currentColor')
        .attr('opacity', 0.12)
        .style('font-size', '10px')
        .style('font-family', 'JetBrains Mono');

      lines.forEach((line, i) => {
        textGroup.append('tspan')
          .attr('x', q.labelX)
          .attr('dy', i === 0 ? '-0.3em' : '1.2em')
          .text(line);
      });
    }

    // Grid
    g.append('g')
      .selectAll('line')
      .data(y.ticks(5))
      .join('line')
      .attr('x1', 0).attr('x2', w)
      .attr('y1', (d) => y(d)).attr('y2', (d) => y(d))
      .attr('stroke', 'currentColor').attr('stroke-opacity', 0.06);

    g.append('g')
      .selectAll('line')
      .data(x.ticks(5))
      .join('line')
      .attr('x1', (d) => x(d)).attr('x2', (d) => x(d))
      .attr('y1', 0).attr('y2', h)
      .attr('stroke', 'currentColor').attr('stroke-opacity', 0.06);

    // Dots
    g.selectAll('circle.dot')
      .data(points)
      .join('circle')
      .attr('class', 'dot')
      .attr('cx', (d) => x(d.tss))
      .attr('cy', (d) => y(d.avgHR))
      .attr('r', 5)
      .attr('fill', (d) => getSportColor(d.sport))
      .attr('fill-opacity', 0.7)
      .attr('stroke', (d) => getSportColor(d.sport))
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.9)
      .style('cursor', 'pointer')
      .on('mouseenter', function (_event, d) {
        d3.select(this).attr('r', 7).attr('fill-opacity', 1);
        const cx = x(d.tss) + margin.left;
        const cy = y(d.avgHR) + margin.top;
        setTooltipState({ x: cx, y: cy, point: d });
      })
      .on('mouseleave', function () {
        d3.select(this).attr('r', 5).attr('fill-opacity', 0.7);
        setTooltipState(null);
      });

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(5))
      .call((sel) => sel.select('.domain').remove())
      .call((sel) =>
        sel.selectAll('.tick text')
          .attr('fill', 'currentColor').attr('opacity', 0.35)
          .style('font-family', 'JetBrains Mono').style('font-size', '10px')
      )
      .call((sel) => sel.selectAll('.tick line').remove());

    // X label
    g.append('text')
      .attr('x', w / 2).attr('y', h + 30)
      .attr('text-anchor', 'middle')
      .attr('fill', 'currentColor').attr('opacity', 0.3)
      .style('font-size', '10px').style('font-family', 'JetBrains Mono')
      .text('Training Load (TSS)');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5))
      .call((sel) => sel.select('.domain').remove())
      .call((sel) =>
        sel.selectAll('.tick text')
          .attr('fill', 'currentColor').attr('opacity', 0.35)
          .style('font-family', 'JetBrains Mono').style('font-size', '10px')
      )
      .call((sel) => sel.selectAll('.tick line').remove());

    // Y label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -h / 2).attr('y', -36)
      .attr('text-anchor', 'middle')
      .attr('fill', 'currentColor').attr('opacity', 0.3)
      .style('font-size', '10px').style('font-family', 'JetBrains Mono')
      .text('Avg HR (bpm)');
  }, [points, dimensions]);

  if (points.length < 3) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">Not enough data for the stress/recovery scatter plot.</p>
        <p className="text-xs mt-1 opacity-60">At least 3 activities with heart rate data are needed.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mb-3 text-xs font-mono text-muted-foreground">
        {sports.map((sport) => (
          <span key={sport} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: getSportColor(sport) }}
            />
            {sport}
          </span>
        ))}
      </div>

      <div ref={containerRef} className="relative">
        <svg ref={svgRef} />
        {tooltipState && (
          <div
            className="absolute bg-foreground text-background rounded-lg px-3 py-2 text-xs pointer-events-none shadow-xl z-10"
            style={{
              left: tooltipState.x,
              top: Math.max(8, tooltipState.y - 72),
              transform: 'translateX(-50%)',
            }}
          >
            <div className="opacity-60 text-[10px] mb-1">
              {new Date(tooltipState.point.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: getSportColor(tooltipState.point.sport) }}
              />
              <span className="capitalize">{tooltipState.point.sport}</span>
            </div>
            <div className="mt-1 space-y-0.5 font-mono">
              <div>TSS <span className="font-bold">{tooltipState.point.tss}</span></div>
              <div>HR <span className="font-bold">{tooltipState.point.avgHR} bpm</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
