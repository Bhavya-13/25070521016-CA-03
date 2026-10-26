export default function StatusBadge({ state }) {
  return (
    <span className={`badge ${state.key}`}>
      <span className="badge-dot" aria-hidden="true" />
      {state.label}
    </span>
  );
}
