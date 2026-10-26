export default function Segmented({ options, value, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            className={value === o.value ? 'active' : ''}
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            title={o.title || o.label}
          >
            {Icon && <Icon size={15} aria-hidden="true" />}
            {o.label && <span>{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
