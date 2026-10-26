import { AlertTriangle, Info, Sparkles } from 'lucide-react';

export const SEVERITY_META = {
  critical: { icon: AlertTriangle, label: 'Critical' },
  warning: { icon: AlertTriangle, label: 'Needs attention' },
  info: { icon: Info, label: 'Worth a look' },
  positive: { icon: Sparkles, label: 'Opportunity' },
};
