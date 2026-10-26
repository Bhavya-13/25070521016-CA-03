export default function KpiCard({ icon: Icon, label, value, hint, trend, tone = 'primary' }) {
  return (
    <div className="card kpi">
      <div className="kpi-top">
        <span className={`kpi-icon tone-${tone}`}>
          <Icon size={18} aria-hidden="true" />
        </span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">
        {trend && <span className={`trend ${trend.good ? 'good' : 'bad'}`}>{trend.text}</span>}
        {hint && <span className="muted">{hint}</span>}
      </div>
    </div>
  );
}
