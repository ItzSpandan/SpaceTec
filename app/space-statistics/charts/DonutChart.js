'use client';

import { useState } from 'react';

// Restrained, non-neon color set consistent with SpaceTec's existing accents.
const SLICE_COLORS = ['#38bdf8', '#a78bfa', '#22c55e', '#f59e0b', '#f87171', '#2dd4bf', '#64748b', '#e5e7eb'];

// data: [{ label, value }]
export default function DonutChart({ data, size = 160 }) {
  const [hover, setHover] = useState(null);

  if (!data || data.length === 0) {
    return <div className="stat-chart-empty">DATA UNAVAILABLE</div>;
  }

  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = size / 2;
  const strokeWidth = radius * 0.32;
  const innerRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerRadius;

  let offset = 0;
  const segments = data.map((d, i) => {
    const fraction = total ? d.value / total : 0;
    const dash = fraction * circumference;
    const seg = { ...d, color: SLICE_COLORS[i % SLICE_COLORS.length], dash, offset, fraction };
    offset += dash;
    return seg;
  });

  return (
    <div className="stat-donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${radius} ${radius})`}>
          {segments.map((seg, i) => (
            <circle
              key={seg.label + i}
              cx={radius}
              cy={radius}
              r={innerRadius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
              strokeDashoffset={-seg.offset}
              opacity={hover === null || hover === i ? 1 : 0.35}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ transition: 'opacity 0.15s ease' }}
            />
          ))}
        </g>
      </svg>
      <div className="stat-donut-legend">
        {segments.map((seg, i) => (
          <div
            key={seg.label + i}
            className="stat-donut-legend-item"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{ opacity: hover === null || hover === i ? 1 : 0.45 }}
          >
            <span className="stat-donut-swatch" style={{ background: seg.color }} />
            <span className="stat-donut-legend-label">{seg.label}</span>
            <span className="stat-donut-legend-value">{(seg.fraction * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .stat-donut { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
        .stat-donut-legend { display: flex; flex-direction: column; gap: 6px; }
        .stat-donut-legend-item { display: flex; align-items: center; gap: 8px; transition: opacity 0.15s ease; cursor: default; }
        .stat-donut-swatch { width: 9px; height: 9px; border-radius: 2px; flex-shrink: 0; }
        .stat-donut-legend-label { color: #a1a1aa; font: 700 0.6rem/1 monospace; letter-spacing: 0.5px; text-transform: uppercase; }
        .stat-donut-legend-value { color: #dbe4ef; font: 700 0.6rem/1 monospace; }
      `}</style>
    </div>
  );
}
