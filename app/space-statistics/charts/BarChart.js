'use client';

import { useState } from 'react';

// Horizontal bar chart, built with plain SVG so no new dependency is needed.
// data: [{ label, value }], sorted by the caller.
export default function BarChart({ data, height, valueFormatter }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return <div className="stat-chart-empty">DATA UNAVAILABLE</div>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const rowHeight = 28;
  const chartHeight = height || data.length * rowHeight + 10;
  const format = valueFormatter || ((v) => v.toLocaleString('en-US'));

  return (
    <div className="stat-barchart" style={{ height: chartHeight }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div
            key={d.label + i}
            className="stat-bar-row"
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <span className="stat-bar-label" title={d.label}>{d.label}</span>
            <div className="stat-bar-track">
              <div
                className="stat-bar-fill"
                style={{ width: `${Math.max(pct, 2)}%`, opacity: hoverIndex === null || hoverIndex === i ? 1 : 0.45 }}
              />
            </div>
            <span className="stat-bar-value">{format(d.value)}</span>
          </div>
        );
      })}

      <style jsx>{`
        .stat-barchart { display: flex; flex-direction: column; gap: 6px; justify-content: center; }
        .stat-bar-row { display: grid; grid-template-columns: 130px 1fr 56px; align-items: center; gap: 10px; }
        .stat-bar-label {
          color: #a1a1aa; font: 700 0.62rem/1.2 monospace; letter-spacing: 0.5px; text-transform: uppercase;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .stat-bar-track { height: 10px; background: rgba(255, 255, 255, 0.06); position: relative; }
        .stat-bar-fill { height: 100%; background: #38bdf8; transition: opacity 0.2s ease; }
        .stat-bar-value { color: #dbe4ef; font: 700 0.65rem/1 monospace; text-align: right; }
      `}</style>
    </div>
  );
}
