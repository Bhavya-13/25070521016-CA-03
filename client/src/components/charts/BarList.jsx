// items: [{ key, name, value, color, meta? }]
export default function BarList({ items, format, empty = 'Nothing to show yet.' }) {
  if (!items.length) return <p className="muted">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 0) || 1;
  return (
    <ul className="barlist">
      {items.map((i) => (
        <li key={i.key}>
          <div className="barlist-top">
            <span className="barlist-name">{i.name}</span>
            <span className="barlist-val">
              {format(i.value)}
              {i.meta && <span className="muted"> {i.meta}</span>}
            </span>
          </div>
          <div className="bar-track" role="presentation">
            <div className="bar-fill" style={{ width: `${(i.value / max) * 100}%`, background: i.color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
