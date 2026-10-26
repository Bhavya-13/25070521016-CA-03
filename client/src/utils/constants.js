export const CATEGORIES = [
  'Productivity', 'Entertainment', 'Music', 'Cloud Storage',
  'Education', 'Utilities', 'Health', 'Other',
];

export const CATEGORY_COLORS = {
  Productivity: '#8B78FF',
  Entertainment: '#67D9E8',
  Music: '#34D399',
  'Cloud Storage': '#FBBF24',
  Education: '#FB7185',
  Utilities: '#60A5FA',
  Health: '#F97316',
  Other: '#929CB3',
};

export const CYCLES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom interval' },
];

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'SGD', 'AED'];

export const LOCALES = [
  { value: 'en-IN', label: 'English (India)' },
  { value: 'en-US', label: 'English (United States)' },
  { value: 'en-GB', label: 'English (United Kingdom)' },
  { value: 'de-DE', label: 'Deutsch (Deutschland)' },
  { value: 'fr-FR', label: 'Francais (France)' },
];

export const DATE_FORMATS = [
  { value: 'auto', label: 'Locale default' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];

export const PAYMENT_METHODS = [
  'UPI', 'Credit card', 'Debit card', 'Net banking', 'PayPal', 'Apple / Google Pay', 'Other',
];

export const ICON_KEYS = [
  'Film', 'Tv', 'Music', 'Headphones', 'Cloud', 'BookOpen', 'Dumbbell', 'Zap',
  'Gamepad2', 'ShoppingBag', 'Newspaper', 'Briefcase', 'Code', 'Shield', 'Wifi', 'Smartphone',
];

export const COLOR_SWATCHES = [
  '#8B78FF', '#67D9E8', '#34D399', '#FBBF24', '#FB7185',
  '#60A5FA', '#F97316', '#E50914', '#1DB954', '#929CB3',
];

// Typical INR prices: starting points only, always editable.
export const PRESETS = [
  { name: 'Netflix', price: 649, cycle: 'monthly', category: 'Entertainment', color: '#E50914', icon: 'Film' },
  { name: 'Spotify', price: 119, cycle: 'monthly', category: 'Music', color: '#1DB954', icon: 'Music' },
  { name: 'Prime Video', price: 299, cycle: 'monthly', category: 'Entertainment', color: '#00A8E1', icon: 'Tv' },
  { name: 'YouTube Premium', price: 149, cycle: 'monthly', category: 'Entertainment', color: '#FF2D55', icon: 'Tv' },
  { name: 'Disney+ Hotstar', price: 299, cycle: 'monthly', category: 'Entertainment', color: '#1F80E0', icon: 'Tv' },
  { name: 'iCloud+', price: 75, cycle: 'monthly', category: 'Cloud Storage', color: '#4F9CFF', icon: 'Cloud' },
  { name: 'Google One', price: 130, cycle: 'monthly', category: 'Cloud Storage', color: '#FBBC04', icon: 'Cloud' },
  { name: 'ChatGPT Plus', price: 1999, cycle: 'monthly', category: 'Productivity', color: '#10A37F', icon: 'Zap' },
  { name: 'Canva Pro', price: 499, cycle: 'monthly', category: 'Productivity', color: '#8B5CF6', icon: 'Briefcase' },
  { name: 'Gym', price: 1000, cycle: 'monthly', category: 'Health', color: '#F97316', icon: 'Dumbbell' },
];
