import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

interface FinancialData {
  month: string;
  revenue: number;
  expenses: number;
}

const data: FinancialData[] = [
  { month: 'Jan', revenue: 4000, expenses: 2400 },
  { month: 'Feb', revenue: 3000, expenses: 1398 },
  { month: 'Mar', revenue: 2000, expenses: 9800 },
  { month: 'Apr', revenue: 2780, expenses: 3908 },
  { month: 'May', revenue: 1890, expenses: 4800 },
  { month: 'Jun', revenue: 2390, expenses: 3800 },
  { month: 'Jul', revenue: 3490, expenses: 4300 },
];

interface Props {
  role: string;
}

const FinancialChart: React.FC<Props> = ({ role }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 600;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const x = d3.scaleBand()
      .domain(data.map(d => d.month))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => Math.max(d.revenue, d.expenses)) || 0])
      .range([height - margin.bottom, margin.top]);

    // Revenue bars
    svg.append('g')
      .selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.month)!)
      .attr('y', d => y(d.revenue))
      .attr('width', x.bandwidth() / 2)
      .attr('height', d => height - margin.bottom - y(d.revenue))
      .attr('fill', '#6366f1'); // Indigo-500

    // Expense bars
    svg.append('g')
      .selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.month)! + x.bandwidth() / 2)
      .attr('y', d => y(d.expenses))
      .attr('width', x.bandwidth() / 2)
      .attr('height', d => height - margin.bottom - y(d.expenses))
      .attr('fill', '#f43f5e'); // Rose-500

    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x));

    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

  }, [role]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl w-full">
      <h3 className="text-sm font-bold text-slate-100 mb-4 uppercase font-mono">Financial Insights ({role})</h3>
      <svg ref={svgRef} className="w-full h-auto" />
    </div>
  );
};

export default FinancialChart;
