import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          <span className="brand-dot" />
          Watchdog
        </Link>

        <nav className="nav-actions">
          {user ? (
            <>
              <span className="muted hide-sm">Hi, {user.name.split(' ')[0]}</span>
              <button className="btn ghost small" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn ghost small">Sign in</Link>
              <Link to="/register" className="btn primary small">Get started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
