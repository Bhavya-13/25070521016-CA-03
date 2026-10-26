import { Link } from 'react-router-dom';
import { ArrowRightLeft } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import './fx.css';

// Shown whenever totals include subscriptions converted from another currency.
export default function FxNotice() {
  const { convertedCount, fx, currency, fmt, settings } = useData();
  if (!convertedCount) return null;
  const custom = Object.keys(settings.fxManual || {}).length > 0;
  return (
    <p className="notice fx-notice">
      <ArrowRightLeft size={16} aria-hidden="true" />
      <span>
        {convertedCount} {convertedCount === 1 ? 'subscription is' : 'subscriptions are'} converted to {currency} in these totals, so the figures are approximate.
        {fx ? ` Rates as of ${fmt.date(fx.asOf)}${fx.stale ? ' (could not refresh, using the last saved rates)' : ''}.` : ''}
        {custom ? ' Some rates are set by you.' : ''}{' '}
        <Link to="/settings">Exchange rates</Link>
      </span>
    </p>
  );
}
