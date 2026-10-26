import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../api.js';
import AuthShell from '../components/AuthShell.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <form className="card auth-card" onSubmit={submit}>
        <h1>Welcome back</h1>
        <p className="muted">Sign in to see what renews next.</p>
        {error && <div className="alert" role="alert">{error}</div>}
        <label className="field">
          <span className="field-label">Email</span>
          <input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button className="btn primary full" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
        <p className="muted center">New here? <Link to="/register">Create an account</Link></p>
      </form>
    </AuthShell>
  );
}
