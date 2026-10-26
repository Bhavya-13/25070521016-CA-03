import ServiceIcon from './ServiceIcon.jsx';
import './fx.css';
import StatusBadge, { PaidBadge, UnpaidBadge } from './StatusBadge.jsx';
import { QuickActions } from './SubscriptionCard.jsx';
import { useData } from '../context/DataContext.jsx';
import { cycleText } from '../utils/finance.js';
import { renewalState } from '../utils/format.js';

export default function SubscriptionTable({ subs, onOpen, onEdit, actions }) {
  const { today, fmt, converter, currency } = useData();
  return (
    <div className="table-wrap card">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Service</th>
            <th scope="col">Price</th>
            <th scope="col">Billing</th>
            <th scope="col">Next renewal</th>
            <th scope="col">Payment</th>
            <th scope="col">Status</th>
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {subs.map((s) => {
            const st = renewalState(s, today);
            return (
              <tr key={s._id}>
                <td data-label="Service">
                  <div className="cell-service">
                    <ServiceIcon name={s.name} color={s.color} icon={s.icon} size={34} />
                    <div>
                      <button type="button" className="plain-link" onClick={() => onOpen(s)}>{s.name}</button>
                      <span className="muted small">{s.category}{s.isDemo ? ' - Demo' : ''}</span>
                    </div>
                  </div>
                </td>
                <td data-label="Price">
                  {s.currency !== currency && converter.has(s.currency) ? (
                    <div className="price-pair">
                      <strong>{`\u2248 ${fmt.money(converter.convert(s.price, s.currency), currency)}`}</strong>
                      <span className="muted small">{fmt.money(s.price, s.currency)} originally</span>
                    </div>
                  ) : (
                    <strong>{fmt.money(s.price, s.currency)}</strong>
                  )}
                </td>
                <td data-label="Billing">{cycleText(s)}</td>
                <td data-label="Next renewal">{s.status === 'cancelled' ? '-' : fmt.date(s.nextRenewal)}</td>
                <td data-label="Payment">{s.paymentMethod || '-'}</td>
                <td data-label="Status"><div className="badge-stack inline"><StatusBadge state={st} /><UnpaidBadge sub={s} /><PaidBadge sub={s} /></div></td>
                <td className="cell-actions"><QuickActions sub={s} onOpen={onOpen} onEdit={onEdit} actions={actions} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
