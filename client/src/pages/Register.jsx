import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../api.js';
import AuthShell, { AuthField } from '../components/AuthShell.jsx';

const LEVELS = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'];

function strength(pw) {
  if (pw.length < 6) return 0;
  let s = 1;
  if (pw.length >= 8) s += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s += 1;
  return Math.min(4, s);
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const level = strength(form.password);

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

  const meter = form.password ? (
    <div className="au-strength" aria-live="polite">
      <div className={`au-strength-bars lvl-${level}`}>
        {[1, 2, 3, 4].map((n) => <i key={n} className={n <= level ? 'on' : ''} />)}
      </div>
      <span className="au-strength-label">{LEVELS[level]}</span>
    </div>
  ) : (
    <span className="au-hint">Use at least 6 characters. Longer is better.</span>
  );

  return (
    <AuthShell>
      <form onSubmit={submit}>
        <h1 className="au-heading">Create your account</h1>
        <p className="au-lede">Keep an eye on every subscription in one place.</p>

        {error && <div className="alert" role="alert">{error}</div>}

        <AuthField label="Name" icon={User} autoComplete="name" maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <AuthField label="Email" icon={Mail} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <AuthField label="Password" icon={Lock} type="password" autoComplete="new-password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} hint={meter} />

        <button className="btn primary au-submit" disabled={busy}>
          {busy ? 'Creating account...' : <>Create account <ArrowRight size={17} aria-hidden="true" /></>}
        </button>

        <p className="au-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </AuthShell>
  );
}
