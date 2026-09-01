'use client';

import { useState } from 'react';

// Simple SVG line chart for a single series over time.
// data: [{ label, value }] — label is typically a year.
export default function LineChart({ data, width = 640, height = 220 }) {
  const [hover, setHover] = useState(null);

  if (!data || data.length < 2) {
    return <div className="stat-chart-empty">DATA UNAVAILABLE</div>;
  }

  const padding = { top: 16, right: 16, bottom: 28, left: 40 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(...data.map((d) => d.value), 1);

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * innerW;
    const y = padding.top + innerH - (d.value / max) * innerH;
    return { ...d, x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${points[points.length - 1].x.toFixed(1)},${padding.top + innerH} L${points[0].x.toFixed(1)},${padding.top + innerH} Z`;

  const labelStep = Math.ceil(points.length / 8);

  return (
    <div className="stat-linechart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerH} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <line x1={padding.left} y1={padding.top + innerH} x2={padding.left + innerW} y2={padding.top + innerH} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

        <path d={areaD} fill="rgba(56, 189, 248, 0.08)" stroke="none" />
        <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="1.5" />

        {points.map((p, i) => (
          <g key={p.label + i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <circle cx={p.x} cy={p.y} r={hover === i ? 4 : 2.5} fill="#38bdf8" />
            <rect x={p.x - 10} y={padding.top} width="20" height={innerH} fill="transparent" />
            {i % labelStep === 0 && (
              <text x={p.x} y={height - 8} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">
                {p.label}
              </text>
            )}
          </g>
        ))}

        {hover !== null && (
          <text x={points[hover].x} y={points[hover].y - 10} textAnchor="middle" fontSize="10" fill="#f8fafc" fontFamily="monospace" fontWeight="700">
            {points[hover].value}
          </text>
        )}
      </svg>
    </div>
  );
}
