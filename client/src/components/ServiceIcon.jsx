import {
  Film, Tv, Music, Headphones, Cloud, BookOpen, Dumbbell, Zap,
  Gamepad2, ShoppingBag, Newspaper, Briefcase, Code, Shield, Wifi, Smartphone,
} from 'lucide-react';
import { initials } from '../utils/format.js';

export const ICON_MAP = {
  Film, Tv, Music, Headphones, Cloud, BookOpen, Dumbbell, Zap,
  Gamepad2, ShoppingBag, Newspaper, Briefcase, Code, Shield, Wifi, Smartphone,
};

export default function ServiceIcon({ name, color = '#8B78FF', icon, size = 40 }) {
  const Icon = icon ? ICON_MAP[icon] : null;
  return (
    <span
      className="svc-icon"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: `${color}22`,
        color,
        borderColor: `${color}55`,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {Icon ? <Icon size={Math.round(size * 0.5)} /> : initials(name)}
    </span>
  );
}
