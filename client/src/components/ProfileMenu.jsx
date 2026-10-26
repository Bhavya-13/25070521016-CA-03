import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { initials } from '../utils/format.js';
import { useClickOutside } from '../hooks/useClickOutside.js';

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false), open);

  const signOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="popover-wrap" ref={ref}>
      <button type="button" className="profile-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        <span className="avatar">{initials(user.name)}</span>
        <span className="profile-name hide-md">{user.name.split(' ')[0]}</span>
        <ChevronDown size={14} className="hide-md" />
      </button>
      {open && (
        <div className="popover profile" role="menu">
          <div className="profile-head">
            <span className="avatar lg">{initials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <span className="muted small">{user.email}</span>
            </div>
          </div>
          <Link to="/settings" className="menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <Settings size={16} /> Settings
          </Link>
          <button type="button" className="menu-item" role="menuitem" onClick={signOut}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
