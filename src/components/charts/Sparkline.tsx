import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function Sparkline({ data, color = 'var(--primary)', width = 96, height = 32 }: SparklineProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const x = d3.scaleLinear().domain([0, data.length - 1]).range([2, width - 2]);
    const y = d3.scaleLinear()
      .domain([d3.min(data) || 0, d3.max(data) || 1])
      .range([height - 2, 2]);

    const line = d3.line<number>()
      .x((_, i) => x(i))
      .y((d) => y(d))
      .curve(d3.curveMonotoneX);

    svg
      .append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 1.5)
      .attr('d', line);

    // End dot
    svg
      .append('circle')
      .attr('cx', x(data.length - 1))
      .attr('cy', y(data[data.length - 1]))
      .attr('r', 2)
      .attr('fill', color);
  }, [data, color, width, height]);

  return <svg ref={svgRef} width={width} height={height} />;
}
