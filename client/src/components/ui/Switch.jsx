export default function Switch({ checked, onChange, label, description, id }) {
  return (
    <div className="switch-row">
      <div>
        <label htmlFor={id} className="switch-label">{label}</label>
        {description && <p className="muted small">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={`switch ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-knob" />
      </button>
    </div>
  );
}
