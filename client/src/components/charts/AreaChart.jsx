import { useId, useState } from 'react';
import { compact, niceMax } from './axis.js';

const W = 640;
const PAD = { l: 52, r: 16, t: 16, b: 30 };

export default function AreaChart({ data, format, height = 230, color = 'var(--primary)', label = 'Chart' }) {
  const [hover, setHover] = useState(null);
  const gid = useId().replace(/:/g, '');
  if (!data.length) return null;

  const H = height;
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const top = niceMax(Math.max(...data.map((d) => d.value), 0));
  const x = (i) => PAD.l + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v) => PAD.t + innerH - (v / top) * innerH;
  const pts = data.map((d, i) => [x(i), y(d.value)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = pts.length > 1
    ? `${line} L${pts[pts.length - 1][0].toFixed(1)},${PAD.t + innerH} L${pts[0][0].toFixed(1)},${PAD.t + innerH} Z`
    : '';
  const ticks = [0, 1, 2, 3, 4].map((i) => (top * i) / 4);
  const every = Math.ceil(data.length / 8);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    data.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
    setHover(best);
  };

  const h = hover != null ? data[hover] : null;

  return (
    <div className="chart" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="grid-line" />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="axis-text">{compact(t)}</text>
          </g>
        ))}
        {data.map((d, i) => (i % every === 0 ? (
          <text key={d.label + i} x={x(i)} y={H - 8} textAnchor="middle" className="axis-text">{d.label}</text>
        ) : null))}
        {area && <path d={area} fill={`url(#${gid})`} className="chart-anim" />}
        {pts.length > 1 && <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="chart-anim" />}
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={hover === i ? 5 : data.length <= 12 ? 3.5 : 0} fill="var(--card)" stroke={color} strokeWidth="2" />
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + innerH} className="hover-line" />}
      </svg>
      {h && (
        <div className="tooltip" style={{ left: `${Math.min(88, Math.max(12, (x(hover) / W) * 100))}%` }}>
          <strong>{h.tooltipTitle || h.label}</strong>
          <span>{format(h.value)}</span>
          {h.note && <em>{h.note}</em>}
        </div>
      )}
    </div>
  );
}
