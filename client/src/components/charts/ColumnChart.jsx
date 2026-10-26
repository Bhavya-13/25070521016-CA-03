import { useState } from 'react';
import { compact, niceMax } from './axis.js';

const W = 640;
const PAD = { l: 52, r: 12, t: 14, b: 30 };

// data: [{ label, tooltipTitle?, segments: [{ key, name, value, color, opacity? }] }]
export default function ColumnChart({ data, format, height = 240, label = 'Chart' }) {
  const [hover, setHover] = useState(null);
  if (!data.length) return null;

  const H = height;
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const sums = data.map((d) => d.segments.reduce((t, s) => t + s.value, 0));
  const top = niceMax(Math.max(...sums, 0));
  const band = innerW / data.length;
  const bw = Math.min(42, band * 0.62);
  const y = (v) => PAD.t + innerH - (v / top) * innerH;
  const ticks = [0, 1, 2, 3, 4].map((i) => (top * i) / 4);
  const every = Math.ceil(data.length / 10);
  const cx = (i) => PAD.l + band * i + band / 2;

  const h = hover != null ? data[hover] : null;

  return (
    <div className="chart" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="grid-line" />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="axis-text">{compact(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          let acc = 0;
          return (
            <g key={d.label + i} onMouseEnter={() => setHover(i)} onMouseMove={() => setHover(i)}>
              <rect x={PAD.l + band * i} y={PAD.t} width={band} height={innerH} fill="transparent" />
              {hover === i && <rect x={PAD.l + band * i + 2} y={PAD.t} width={band - 4} height={innerH} className="hover-band" />}
              {d.segments.map((s) => {
                const y1 = y(acc + s.value);
                const hgt = y(acc) - y1;
                acc += s.value;
                return hgt > 0 ? (
                  <rect key={s.key} x={cx(i) - bw / 2} y={y1} width={bw} height={hgt} rx="3" fill={s.color} opacity={s.opacity ?? 1} className="chart-anim" />
                ) : null;
              })}
              {i % every === 0 && <text x={cx(i)} y={H - 8} textAnchor="middle" className="axis-text">{d.label}</text>}
            </g>
          );
        })}
      </svg>
      {h && (
        <div className="tooltip" style={{ left: `${Math.min(86, Math.max(14, (cx(hover) / W) * 100))}%` }}>
          <strong>{h.tooltipTitle || h.label}</strong>
          {h.segments.map((s) => (
            <span key={s.key} className="tt-row">
              <i style={{ background: s.color, opacity: s.opacity ?? 1 }} />
              {s.name}: {format(s.value)}
            </span>
          ))}
          <span className="tt-total">Total: {format(sums[hover])}</span>
          {h.note && <em>{h.note}</em>}
        </div>
      )}
    </div>
  );
}
