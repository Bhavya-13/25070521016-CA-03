import ServiceIcon from './ServiceIcon.jsx';
import StatusBadge from './StatusBadge.jsx';
import { QuickActions } from './SubscriptionCard.jsx';
import { useData } from '../context/DataContext.jsx';
import { cycleText } from '../utils/finance.js';
import { renewalState } from '../utils/format.js';

export default function SubscriptionTable({ subs, onOpen, onEdit, actions }) {
  const { today, fmt } = useData();
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
                <td data-label="Price"><strong>{fmt.money(s.price, s.currency)}</strong></td>
                <td data-label="Billing">{cycleText(s)}</td>
                <td data-label="Next renewal">{s.status === 'cancelled' ? '-' : fmt.date(s.nextRenewal)}</td>
                <td data-label="Payment">{s.paymentMethod || '-'}</td>
                <td data-label="Status"><StatusBadge state={st} /></td>
                <td className="cell-actions"><QuickActions sub={s} onOpen={onOpen} onEdit={onEdit} actions={actions} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
