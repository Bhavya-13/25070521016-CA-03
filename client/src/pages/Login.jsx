import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../api.js';
import AuthShell, { AuthField } from '../components/AuthShell.jsx';

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
      <form onSubmit={submit}>
        <h1 className="au-heading">Welcome back</h1>
        <p className="au-lede">Sign in to see what renews next.</p>

        {error && <div className="alert" role="alert">{error}</div>}

        <AuthField label="Email" icon={Mail} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <AuthField label="Password" icon={Lock} type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

        <button className="btn primary au-submit" disabled={busy}>
          {busy ? 'Signing in...' : <>Sign in <ArrowRight size={17} aria-hidden="true" /></>}
        </button>

        <p className="au-switch">New to Watchdog? <Link to="/register">Create an account</Link></p>
      </form>
    </AuthShell>
  );
}
