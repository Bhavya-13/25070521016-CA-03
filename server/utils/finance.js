export function annualFactor(cycle, customDays) {
  switch (cycle) {
    case 'weekly': return 52;
    case 'quarterly': return 4;
    case 'yearly': return 1;
    case 'custom': return 365 / Math.max(1, customDays || 30);
    default: return 12;
  }
}

export const annualCost = (s) => (Number(s.price) || 0) * annualFactor(s.cycle, s.customDays);
export const monthlyCost = (s) => annualCost(s) / 12;
