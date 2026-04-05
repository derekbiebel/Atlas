import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { usePreferences } from '../../store/usePreferences';
import { formatDistance, distanceUnit } from '../../lib/units';

interface WeeklyDistanceChartProps {
  data: { week: string; value: number }[];
  comparisonData?: { week: string; value: number }[];
  comparison: 'YoY' | 'MoM' | 'WoW' | 'None';
  onComparisonChange: (c: 'YoY' | 'MoM' | 'WoW' | 'None') => void;
}

export function WeeklyDistanceChart({
  data,
  comparisonData,
  comparison,
  onComparisonChange,
}: WeeklyDistanceChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 });
  const units = usePreferences((s) => s.units);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDimensions({ width, height: 300 });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Convert distance based on units
    const convert = (meters: number) => {
      return units === 'imperial' ? meters / 1609.344 : meters / 1000;
    };

    const allValues = [...data.map((d) => convert(d.value))];
    if (comparisonData && comparison !== 'None') {
      allValues.push(...comparisonData.map((d) => convert(d.value)));
    }

    const x = d3.scaleTime()
      .domain(d3.extent(data, (d) => new Date(d.week)) as [Date, Date])
      .range([0, w]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(allValues) || 1])
      .nice()
      .range([h, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(y.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', w)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', 'var(--border)')
      .attr('stroke-dasharray', '2,2');

    // Area + line for primary
    const area = d3.area<{ week: string; value: number }>()
      .x((d) => x(new Date(d.week)))
      .y0(h)
      .y1((d) => y(convert(d.value)))
      .curve(d3.curveMonotoneX);

    const line = d3.line<{ week: string; value: number }>()
      .x((d) => x(new Date(d.week)))
      .y((d) => y(convert(d.value)))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'var(--primary)')
      .attr('fill-opacity', 0.15)
      .attr('d', area);

    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'var(--primary)')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Comparison line
    if (comparisonData && comparisonData.length > 0 && comparison !== 'None') {
      g.append('path')
        .datum(comparisonData)
        .attr('fill', 'none')
        .attr('stroke', 'var(--secondary)')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3')
        .attr('d', line);
    }

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat((d) => d3.timeFormat('%b')(d as Date)))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick text').attr('fill', 'var(--text3)').style('font-family', 'JetBrains Mono').style('font-size', '10px'))
      .call((g) => g.selectAll('.tick line').attr('stroke', 'var(--border)'));

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat((d) => `${d}`))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick text').attr('fill', 'var(--text3)').style('font-family', 'JetBrains Mono').style('font-size', '10px'))
      .call((g) => g.selectAll('.tick line').remove());

    // Tooltip
    const tooltip = d3.select(containerRef.current)
      .append('div')
      .attr('class', 'absolute hidden bg-[var(--surface)] border border-[var(--border2)] rounded-lg px-3 py-2 text-xs pointer-events-none shadow-lg')
      .style('z-index', '10');

    const bisect = d3.bisector<{ week: string; value: number }, Date>((d) => new Date(d.week)).left;

    svg.on('mousemove', (event) => {
      const [mx] = d3.pointer(event, g.node());
      const date = x.invert(mx);
      const idx = bisect(data, date, 1);
      const d = data[idx - 1] || data[idx];
      if (!d) return;

      tooltip
        .classed('hidden', false)
        .html(`
          <div class="font-mono font-semibold">${formatDistance(d.value, units)} ${distanceUnit(units)}</div>
          <div class="text-[var(--text3)]">Week of ${d.week}</div>
        `)
        .style('left', `${x(new Date(d.week)) + margin.left + 10}px`)
        .style('top', `${y(convert(d.value)) + margin.top - 10}px`);
    });

    svg.on('mouseleave', () => {
      tooltip.classed('hidden', true);
    });

    return () => {
      tooltip.remove();
    };
  }, [data, comparisonData, comparison, dimensions, units]);

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text2)]">Weekly Distance</h3>
        <div className="flex gap-1">
          {(['YoY', 'MoM', 'WoW', 'None'] as const).map((c) => (
            <button
              key={c}
              onClick={() => onComparisonChange(c)}
              className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                comparison === c
                  ? 'bg-[var(--primary-light)] text-[var(--primary-text)]'
                  : 'text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="relative">
        <svg ref={svgRef} />
      </div>
    </div>
  );
}
