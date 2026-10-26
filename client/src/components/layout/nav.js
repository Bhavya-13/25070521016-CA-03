import { LayoutDashboard, CreditCard, CalendarDays, BarChart3, Lightbulb, PiggyBank, Settings } from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/insights', label: 'Insights', icon: Lightbulb },
  { to: '/savings', label: 'Savings Planner', icon: PiggyBank },
  { to: '/settings', label: 'Settings', icon: Settings },
];
