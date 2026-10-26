export default function EmptyState({ icon: Icon, title, text, action, compact = false }) {
  return (
    <div className={`empty ${compact ? 'compact' : ''}`}>
      {Icon && (
        <div className="empty-icon">
          <Icon size={compact ? 20 : 26} aria-hidden="true" />
        </div>
      )}
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  );
}
