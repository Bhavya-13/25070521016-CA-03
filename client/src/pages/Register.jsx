import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../api.js';
import AuthShell from '../components/AuthShell.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <form className="card auth-card" onSubmit={submit}>
        <h1>Create your account</h1>
        <p className="muted">Keep an eye on every subscription in one place.</p>
        {error && <div className="alert" role="alert">{error}</div>}
        <label className="field">
          <span className="field-label">Name</span>
          <input required maxLength={60} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">Email</span>
          <input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">Password (min 6 characters)</span>
          <input type="password" required minLength={6} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button className="btn primary full" disabled={busy}>{busy ? 'Creating account...' : 'Create account'}</button>
        <p className="muted center">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </AuthShell>
  );
}
