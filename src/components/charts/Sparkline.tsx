import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

// Simple moving average to smooth the data
function smooth(data: number[], window = 5): number[] {
  if (data.length <= window) return data;
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(data.length, i + Math.ceil(window / 2));
    const slice = data.slice(start, end);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

export function Sparkline({ data, color = 'var(--primary)', width = 96, height = 32 }: SparklineProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Smooth the data with a 7-point moving average
    const smoothed = smooth(data, 7);

    const x = d3.scaleLinear().domain([0, smoothed.length - 1]).range([2, width - 2]);
    const y = d3.scaleLinear()
      .domain([d3.min(smoothed) || 0, d3.max(smoothed) || 1])
      .range([height - 3, 3]);

    const line = d3.line<number>()
      .x((_, i) => x(i))
      .y((d) => y(d))
      .curve(d3.curveBasis);

    svg
      .append('path')
      .datum(smoothed)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 1.5)
      .attr('stroke-linecap', 'round')
      .attr('d', line);

    // End dot
    svg
      .append('circle')
      .attr('cx', x(smoothed.length - 1))
      .attr('cy', y(smoothed[smoothed.length - 1]))
      .attr('r', 2)
      .attr('fill', color);
  }, [data, color, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
}
