import { useState } from 'react';

const R = 70;
const C = 2 * Math.PI * R;

// data: [{ name, value, color }]
export default function DonutChart({ data, format, centerLabel, centerValue, size = 180, label = 'Chart' }) {
  const [hover, setHover] = useState(null);
  const total = data.reduce((t, d) => t + d.value, 0);
  let acc = 0;
  const active = hover != null ? data[hover] : null;

  return (
    <div className="donut">
      <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={label}>
        <circle cx="100" cy="100" r={R} fill="none" stroke="var(--border)" strokeWidth="22" opacity="0.6" />
        {total > 0 && data.map((d, i) => {
          const len = (d.value / total) * C;
          const offset = acc;
          acc += len;
          const dash = Math.max(len - (data.length > 1 ? 2 : 0), 0);
          return (
            <circle
              key={d.name}
              cx="100" cy="100" r={R} fill="none"
              stroke={d.color}
              strokeWidth={hover === i ? 27 : 22}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 100 100)"
              opacity={hover == null || hover === i ? 1 : 0.35}
              className="donut-seg"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
        <text x="100" y="94" textAnchor="middle" className="donut-label">{active ? active.name : centerLabel}</text>
        <text x="100" y="116" textAnchor="middle" className="donut-value">{active ? format(active.value) : centerValue}</text>
      </svg>
      <ul className="legend">
        {data.map((d, i) => (
          <li key={d.name} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={hover === i ? 'active' : ''}>
            <i style={{ background: d.color }} />
            <span className="legend-name">{d.name}</span>
            <span className="legend-val">{format(d.value)}</span>
            <span className="muted legend-pct">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
